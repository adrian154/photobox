/*
 * DELETE /api/posts/<post>/tags/<tag>
 * Parameters: none
 * Response: none 
 */
const {Posts} = require("../data-layer.js");

module.exports = (req, res) => {
    if(req.session) {
        Posts.removeTag(String(req.params.post), String(req.params.tag));    
        res.sendStatus(200);
    } else {
        res.sendStatus(401);
    }
};