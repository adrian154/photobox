/*
 * DELETE /api/posts/<post>
 * Response: none
 */
const {Posts, Collections} = require("../data-layer.js");

module.exports = (req, res) => {

    const post = Posts.get(String(req.params.post));
    if(!post) {
        return res.sendStatus(404);
    }

    const storageEngine = req.storageEngines[Collections.get(post.collection)?.storageEngine];
    if(storageEngine) {
        storageEngine.delete(post);
    }

    Posts.remove(post.id);
    res.sendStatus(200);

};