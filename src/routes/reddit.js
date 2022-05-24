const fetch = require("node-fetch");
const tags = require("../tags.js");

// the user may want to configure some "private" feeds (e.g. saved/upvoted, multireddits)
// unfortunately, this means we can't support hidden multireddits
const feeds = require("../../config.json").redditFeedURLs;

// get the reddit url to fetch posts from
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
    }

    if(url) {
        url.searchParams.set("limit", 25);
        url.searchParams.set("raw_json", 1);
        if(params.period) url.searchParams.set("t", params.period);
    }
    
    return url;

};

const processPost = async (redditPost) => {

    // ignore self posts
    if(redditPost.post_hint === "self") {
        return;
    }

    // skip posts which don't have a preview 
    const preview = redditPost.preview?.images[0]?.resolutions.pop();
    if(!preview) return;

    // pretend the post is an image initially
    const post = {
        id: redditPost.name,
        timestamp: redditPost.created_utc * 1000,
        versions: {
            preview,
            display: {url: redditPost.url_overridden_by_dest},
            original: {
                url: redditPost.url_overridden_by_dest
            }
        },
        srcLink: new URL(redditPost.permalink, "https://reddit.com/").href,
        type: "image",
        tags: ["r/" + redditPost.subreddit, "u/" + redditPost.author],
        hint: redditPost.post_hint
    };

    // problem: reddit doesn't recognize .GIFVs as videos, handle this case manually
    if(redditPost.url_overridden_by_dest?.includes(".gifv")) {
        post.type = "video";
        // TODO: retrieve the video from Imgur
        //post.versions.original = {url: redditPost.url_overridden_by_dest};
    }

    // handle redgifs
    const redgifsID = redditPost.url_overridden_by_dest.match(/watch\/(\w+)/)?.[1];
    if(redgifsID) {
        const resp = await fetch(`https://api.redgifs.com/v2/gifs/${redgifsID}`);
        const result = await resp.json();
        post.type = "video";
        post.versions.videoPreview = {url: result.gif.urls.vthumbnail};
        post.versions.display = {url: result.gif.urls.sd};
        post.versions.original = {url: result.gif.urls.hd, width: result.gif.width, height: result.gif.height};
        post.tags.push(tags.VIDEO, ...result.gif.tags);
        if(result.gif.hasAudio) {
            post.tags.push(tags.SOUND);
        }
    }

    // TODO: expand imgur albums

    return post;

};

module.exports = async (req, res) => {

    const url = getFeedURL(req.query);
    console.log(url.href);

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