/*
 * GET /api/collections/<collection>
 * Response: JSON
 *     {
 *         name: string,
 *         posts: [Post (see get-post.js)]
 *     }
 */
const {Collections} = require("../data-layer.js");

module.exports = (req, res) => {
    
    const collection = Collections.get(String(req.params.collection));
    if(!collection) return res.sendStatus(404);

    res.json({
        name: collection.name,
        managed: true,
        posts: Collections.getPosts(collection.name)
    });

};