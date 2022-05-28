const fetch = require("node-fetch");
const tags = require("../tags.js");
const {imgurClientID} = require("../../config.json");

// reuse imgur item handling code for individual posts and galleries
const processImgurItem = (basePost, redditPreview, item) => {

    // clone base post
    const clone = Object.assign({}, basePost);
    clone.versions = {preview: redditPreview};
    clone.tags = [...basePost.tags, item.tags];

    if(item.mp4) {
        clone.type = "video";
        clone.versions.videoPreview = clone.versions.display = clone.versions.original = {url: item.mp4, width: item.width, height: item.height};
        clone.tags.push(tags.VIDEO);
        if(item.has_sound) {
            clone.tags.push(tags.SOUND);
        }
    } else {
        clone.type = "image";
        clone.versions.original = clone.versions.display = {url: item.link, width: item.width, height: item.height};
        // adding 'm' after the hash yields the medium size thumbnail; we can use the original image's dimensions as the preview's dimensions because aspect ratio is all that matters for now
        const parts = item.link.split('.');
        parts[parts.length - 2] += 'l';
        clone.versions.preview = {url: parts.join('.'), width: item.width, height: item.height}; 
    }

    return clone;

};

// The following logic is a little convoluted because the Reddit API can be less than intuitive; I've done my best to justify everything.
const processPost = async (redditPost) => {

    // Ignore self posts, we know for sure that we have no interest in displaying them
    if(redditPost.post_hint === "self") {
        return;
    }

    // There are some displayable posts that don't have a preview, which *really* complicates things.
    // If previews are available, we use the 3rd resolution, which is reasonably sized. 
    const redditPreview = redditPost.preview?.images[0]?.resolutions[2] || redditPost.preview?.images[0].resolutions[1] || redditPost.preview?.images[0].resolutions[0];

    // Construct a "base post"
    const post = {
        id: redditPost.name, // this isn't the post title, it's the post ID
        timestamp: redditPost.created_utc * 1000,
        srcLink: new URL(redditPost.permalink, "https://reddit.com/").href,
        tags: ["r/" + redditPost.subreddit, "u/" + redditPost.author],
        url: redditPost.url_overridden_by_dest, // include url so that posts submitted to multiple places can be filtered
        versions: {}
    };

    // handle images
    if(redditPost.post_hint === "image") {
        post.type = "image";
        post.versions.preview = redditPreview;
        post.versions.display = post.versions.original = {url: redditPost.url_overridden_by_dest};
        return post;
    }

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
    if(imgurID && redditPreview && imgurClientID) {
        const resp = await fetch(`https://api.imgur.com/3/image/${imgurID}`, {headers: {"Authorization": `Client-ID ${imgurClientID}`}});
        const result = await resp.json();
        return processImgurItem(post, redditPreview, result.data);
    }

    // split imgur galleries into multiple posts
    const imgurGalleryID = redditPost.url_overridden_by_dest?.match(/imgur.com\/a\/(\w+)/)?.[1];
    if(redditPost.post_hint === "link" && imgurGalleryID && imgurClientID) {
        const resp = await fetch(`https://api.imgur.com/3/album/${imgurGalleryID}`, {headers: {"Authorization": `Client-ID ${imgurClientID}`}});
        const result = await resp.json();
        return result.data.images.map(item => processImgurItem(post, redditPreview, item));
    }

    // TODO: reddit hosted video
    // reddit uses hls so this may not be possible to handle without extensive processing.

    // handle galleries similarly to regular images
    if(redditPost.gallery_data) {
        // util fn to rename fields in gallery images
        const convert = img => ({url: img.u || img.gif, width: img.x, height: img.y});
        return redditPost.gallery_data.items.map(item => redditPost.media_metadata[item.media_id]).map(item => {
            const clone = Object.assign({}, post);
            clone.type = "image";
            clone.versions = {};
            clone.versions.preview = convert(item.p[2] || item.p[1] || item.p[0]); // `p` contains array of previews; prefer resolution #3, fall back to lower resolutions if not available
            clone.versions.display = clone.versions.original = convert(item.s);
            return clone;
        });
    }

};

// cache previews 
const previews = {};

module.exports = {
    getPreview: name => ({name, preview: previews[name]}),
    getPosts: async (collection, after) => {

        const url = new URL(collection.feedURL);
        url.searchParams.set("limit", 50);
        url.searchParams.set("raw_json", 1);
        if(after) {
            url.searchParams.set("after", after);
        }

        const resp = await fetch(url);
        const data = await resp.json();
        const posts = (await Promise.allSettled(data.data.children.map(child => processPost(child.data)))).map(result => result.value).filter(Boolean);

        // cache preview
        if(!after) {

            // account for post clusters
            const previewPost = Array.isArray(posts[0]) ? posts[0][0] : posts[0];
            previews[collection.name] = previewPost.versions.preview?.url || previewPost.versions.original?.url;
            
        }

        return {posts, after: data.data.after};
        
    },
    processPost
};