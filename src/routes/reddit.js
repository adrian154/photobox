const {processPost} = require("../feed-providers/reddit.js");
const fetch = require("node-fetch");

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
        url.searchParams.set("limit", 50);
        url.searchParams.set("raw_json", 1);
        if(params.period) url.searchParams.set("t", params.period);
    }
    
    return url;

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
        name: "Live Reddit Feed",
        posts,
        after: data.data.after
    });

};