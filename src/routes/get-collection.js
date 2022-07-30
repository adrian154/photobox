/*
 * GET /api/collections/<collection>
 * Response: JSON
 *     {
 *         name: string,
 *         posts: [Post (see get-post.js)]
 *     }
 */
const {Collections} = require("../data-layer.js");
const feeds = require("../feed-providers/feeds.js");

module.exports = async (req, res) => {

    const collection = Collections.get(String(req.params.collection));
    if(!collection) return res.sendStatus(404);

    // don't show private collections to anonymous users
    if(!req.session && collection.visibility != "public") {
        return res.sendStatus(404);
    }

    const feed = feeds[collection.type];
    const {posts, after} = await feed.getPosts(collection, req.query.after);

    res.json({
        name: collection.name,
        type: collection.type,
        posts,
        after
    });

};