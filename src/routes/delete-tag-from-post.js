/*
 * DELETE /api/posts/<post>/tags/<tag>
 * Parameters: none
 * Response: none 
 */
const {Posts} = require("../data-layer.js");

module.exports = (req, res) => {
    Posts.removeTag(String(req.params.post), String(req.params.tag));    
    res.sendStatus(200);
};