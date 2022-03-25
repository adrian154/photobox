/*
 * GET /api/homepage
 * Parameters: none
 * Response: (JSON) list of collection names
 */
module.exports = (req, res) => {
    res.json(req.db.getCollectionNames().map(collection => {
        const post = req.db.getFirstPost(collection);
        return {name: collection, preview: post?.preview.url || "/images/default-post.png", numPosts: req.db.getNumPosts(collection)};
    }));
};