const fetch = require("node-fetch");
const tags = require("../tags.js");
const {imgurClientID} = require("../../config.json");

// Users are able to generate secret URLs for accessing private feeds (e.g. saved/upvoted) in their Reddit preferences
// We allow users to configure some of these feeds in config.json; this method of access is great since we don't need to bother with auth.
// LIMITATION: No such mechanism exists for private multireddits yet.
const feeds = require("../../config.json").redditFeedURLs;

// Convert user-supplied parameters to the appropriate Reddit endpoint to fetch posts from
// FIXME: The user could potentially supply invalid values to cause some bad shenanigans.
const getFeedURL = params => {

    let url;
    if(params.subreddit) {
        if(params.sort) {
            url = new URL(`https://reddit.com/r/${params.subreddit}/${params.sort}.json`);
        } else {
            url = new URL(`https://reddit.com/r/${params.subreddit}.json`);
        }
    } else if(params.feed) {
        url = new URL(feeds[params.feed]);
    } // TODO: user support

    if(url) {
        url.searchParams.set("limit", 25);
        url.searchParams.set("raw_json", 1);
        if(params.period) url.searchParams.set("t", params.period);
    }
    
    return url;

};

// The following logic is a little convoluted because the Reddit API can be less than intuitive; I've done my best to justify everything.
const processPost = async (redditPost) => {

    // Ignore self posts, we know for sure that we have no interest in displaying them
    if(redditPost.post_hint === "self") {
        return;
    }

    // There are some displayable posts that don't have a preview, which *really* complicates things.
    // If previews are available, we use the 3rd resolution, which is reasonably sized. 
    const redditPreview = redditPost.preview?.images[0]?.resolutions[2];

    // Construct a "base post"
    const post = {
        id: redditPost.name, // this isn't the post title, it's the post ID
        timestamp: redditPost.created_utc * 1000,
        srcLink: new URL(redditPost.permalink, "https://reddit.com/").href,
        tags: ["r/" + redditPost.subreddit, "u/" + redditPost.author],
        versions: {},
        hint: redditPost.post_hint // REMOVEME
    };

    // Handle redgifs
    const redgifsID = redditPost.url_overridden_by_dest?.match(/redgifs.com\/watch\/(\w+)/)?.[1];
    if(redgifsID) {

        const resp = await fetch(`https://api.redgifs.com/v2/gifs/${redgifsID}`);
        const result = await resp.json();
        
        // if `gif` field is missing, gif was deleted/nonexistent
        if(!result.gif) {
            return;
        }

        // if no reddit preview available, use the one provided by redgifs
        // this has the caveat that its true size is not available, but we can use the video size as it'll have the same aspect ratio
        // this horrible practice might come back to bite me in the future when I try to use the preview dimensions in a meaningful way in the client beyond calculating aspect ratio, but whatever
        post.type = "video";
        post.versions.preview = redditPreview || {url: result.gif.urls.thumbnail, width: result.gif.width, height: result.gif.height}; 
        post.versions.videoPreview = {url: result.gif.urls.vthumbnail};
        post.versions.display = {url: result.gif.urls.sd};
        post.versions.original = {url: result.gif.urls.hd, width: result.gif.width, height: result.gif.height};

        // include redgifs tags; also, add audio tag if necessary
        post.tags.push(tags.VIDEO, ...result.gif.tags);
        if(result.gif.hasAudio) {
            post.tags.push(tags.SOUND);
        }

        return post;

    }

    // handle imgur videos
    // the imgur API doesn't provide a preview, so if a reddit preview isn't available we can't display the item
    const imgurID = redditPost.url_overridden_by_dest?.match(/i.imgur.com\/(\w+)\.gifv/)?.[1];
    if(imgurID && redditPreview) {

        const resp = await fetch(`https://api.imgur.com/3/image/${imgurID}`, {headers: {"Authorization": `Client-ID ${imgurClientID}`}});
        const result = await resp.json();

        post.type = "video";
        post.versions.preview = redditPreview;
        post.versions.videoPreview = post.versions.display = post.versions.original = {url: result.data.mp4, width: result.data.width, height: result.data.height};
        return post;

    }

    // TODO: imgur galleries

    // TODO: reddit hosted video

    // handle galleries similarly to regular images
    if(redditPost.gallery_data) {
        // util fn to rename fields in gallery images
        const convert = img => ({url: img.u || img.gif, width: img.x, height: img.y});
        return redditPost.gallery_data.items.map(item => redditPost.media_metadata[item.media_id]).map(item => {
            const clone = Object.assign({}, post);
            clone.type = "image";
            clone.versions = {};
            clone.versions.preview = convert(item.p[2]);
            clone.versions.display = clone.versions.original = convert(item.s);
            return clone;
        });
    }

    // if there's a preview available, treat it as an image and pray it works
    if(redditPreview) {
        post.type = "image";
        post.versions.preview = redditPreview;
        post.versions.display = post.versions.original = {url: redditPost.url_overridden_by_dest};
        return post;
    }

};

module.exports = async (req, res) => {

    const url = getFeedURL(req.query);

    if(req.query.after) {
        url.searchParams.set("after", req.query.after);
    }

    const resp = await fetch(url);
    const data = await resp.json();
    const posts = (await Promise.all(data.data.children.map(child => child.data).map(processPost))).filter(Boolean);

    res.json({
        name: "reddit test", // TODO: better name
        posts,
        after: data.data.after 
    });

};