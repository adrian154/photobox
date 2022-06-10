/*
 * DELETE /api/posts/<post>
 * Response: none
 */
const {Posts, Collections} = require("../data-layer.js");

module.exports = async (req, res) => {

    if(!req.session) {
        return res.sendStatus(401);
    }

    const post = Posts.get(String(req.params.post));
    if(!post) {
        return res.sendStatus(404);
    }

    const storageEngine = req.storageEngines[Collections.get(post.collection)?.storageEngine];
    if(storageEngine) {
        await storageEngine.delete(post);
    }

    Posts.remove(post.id);
    res.sendStatus(200);

};