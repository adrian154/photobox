/*
 * PUT /api/tags/<tag>
 * Parameters: none
 * Response: none 
 */
const {Tags} = require("../data-layer.js");

module.exports = (req, res) => {
    if(req.session) {
        Tags.add(String(req.params.tag));
        res.sendStatus(200);
    } else {
        res.sendStatus(401);
    }
};