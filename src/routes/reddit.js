const {processPost} = require("../feed-providers/reddit.js");
const fetch = require("node-fetch");

// Convert user-supplied parameters to the appropriate Reddit endpoint to fetch posts from
// FIXME: The user could potentially supply invalid values to cause some bad shenanigans.
const getFeedURL = params => {

    let url, name;
    if(params.subreddit) {
        name = "r/" + params.subreddit;
        if(params.sort) {
            url = new URL(`https://reddit.com/r/${params.subreddit}/${params.sort}.json`);
        } else {
            url = new URL(`https://reddit.com/r/${params.subreddit}.json`);
        }
    } else if(params.user) {
        name = "u/" + params.user;
        url = new URL(`https://reddit.com/user/${params.user}/submitted.json`);
        if(params.sort) {
            url.searchParams.set("sort", params.sort);
        }
    }

    if(url) {
        url.searchParams.set("limit", 50);
        url.searchParams.set("raw_json", 1);
        if(params.period) url.searchParams.set("t", params.period);
    }

    return {url, name};

};

module.exports = async (req, res) => {

    const {url, name} = getFeedURL(req.query);
    if(req.query.after) {
        url.searchParams.set("after", req.query.after);
    }

    try {
        const resp = await fetch(url);
        const data = await resp.json();
        const posts = (await Promise.allSettled(data.data.children.map(child => processPost(child.data)))).map(result => result.value).filter(Boolean);

        res.json({
            name,
            posts,
            after: data.data.after
        });
    } catch(err) {
        return {name: "Invalid", posts: []};
    }

};