/*
 * GET /api/tags
 * Parameters: none
 * Response: (JSON) list of tags 
 */
const {Tags} = require("../data-layer.js");
module.exports = (req, res) => {
    if(req.session)
        res.json(Tags.getAll());
    else
        res.json([]);
};