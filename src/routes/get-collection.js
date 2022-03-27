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
    if(!collection) return res.status(404).json({error: "No such collection"});

    res.json({
        name: collection.name,
        posts: Collections.getPosts(collection.name)
    });

};