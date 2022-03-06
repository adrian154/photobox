/*
 * GET /api/collections/<collection>
 * Response: JSON
 *     {
 *         name: string,
 *         posts: [Post (see get-post.js)]
 *     }
 */
module.exports = (req, res) => {
    
    const collection = req.db.getCollection(req.params.collection);
    if(!collection) return res.sendStatus(404);

    const posts = req.db.getPosts(collection.name);
    res.json({
        name: collection.name,
        posts
    });

};