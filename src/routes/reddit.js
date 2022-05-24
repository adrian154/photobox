const fetch = require("node-fetch");

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

const processPost = redditPost => {

    // skip posts which don't have a preview 
    const preview = redditPost.preview?.images[0]?.resolutions.pop();
    if(!preview) return;

    return {
        id: redditPost.name,
        timestamp: redditPost.created_utc * 1000,
        versions: {
            preview,
            display: {url: redditPost.url},
            original: {
                url: redditPost.url
            }
        },
        srcLink: new URL(redditPost.permalink, "https://reddit.com/").href,
        type: "image",
        tags: ["r/" + redditPost.subreddit, "u/" + redditPost.author]
    };

};

module.exports = async (req, res) => {

    const url = getFeedURL(req.query);

    if(req.query.after) {
        url.searchParams.set("after", req.query.after);
    }

    const resp = await fetch(url);
    const data = await resp.json();
    const posts = data.data.children.map(child => child.data).map(processPost).filter(Boolean);

    res.json({
        name: "reddit test",
        posts,
        after: data.data.after 
    });

};