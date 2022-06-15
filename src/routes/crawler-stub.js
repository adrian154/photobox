// Intercept requests from crawlers and serve a stub with OpenGraph embed tags
const {Collections} = require("../data-layer.js");
const Feeds = require("../feed-providers/feeds.js");

// FIXME: XSS VECTOR
const template = ({name, preview, numPosts}) => `<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta property="og:title" content="${numPosts ? `${name} - ${numPosts} posts` : name}">
        <meta property="og:image" content="${preview || "/images/default-post.png"}">
        <meta property="og:site_name" content="Photobox">
        <title>Photobox - ${name}</title>
        <meta>
    </head>
    <body>
        <p>If you are seeing this page, something has gone wrong. <a href="/">Home</a></p>
    </body>
</html>`;

module.exports = (req, res, next) => {

    // primitive heuristic for detecting bots
    // this should get pretty much every crawler
    const userAgent = req.header("user-agent");
    if(req.query.collection && (userAgent.match(/twitterbot/i) || userAgent.match(/discordbot/i))) {
        
        // check if the collection exists
        const collection = Collections.get(req.query.collection);
        if(collection?.visibility !== "public") return res.sendStatus(404);

        // get preview
        const feedProvider = Feeds[collection.type];
        const preview = feedProvider.getPreview(collection.name);

        // send
        res.send(template(preview));

    } else {
        next();
    }

};