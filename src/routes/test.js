const fetch = require("node-fetch");

const processPost = redditPost => {

    // skip posts which don't have a preview 
    const preview = redditPost.preview?.images[0]?.resolutions.pop();
    if(!preview) return;

    return {
        id: redditPost.name,
        collection: "dummy",
        timestamp: redditPost.created_utc * 1000,
        displaySrc: redditPost.url,
        duration: null,
        originalURL: new URL(redditPost.permalink, "https://reddit.com/").href,
        preview,
        type: "image",
        tags: ["r/" + redditPost.subreddit, "u/" + redditPost.author]
    };

};

module.exports = async (req, res) => {

    const url = new URL(FEED_URL);
    url.searchParams.set("limit", 25);
    url.searchParams.set("raw_json", 1);
    url.searchParams.set("sort", "top");
    url.searchParams.set("t", "all");

    if(req.query.after) {
        url.searchParams.set("after", req.query.after);
    }

    const resp = await fetch(url.href);
    const data = await resp.json();
    const posts = data.data.children.map(child => child.data).map(processPost).filter(Boolean);

    res.json({
        name: "reddit test",
        posts,
        after: data.data.after 
    });

};