/*
 * GET /api/tags
 * Parameters: none
 * Response: (JSON) list of tags 
 */
const {Tags} = require("../data-layer.js");
module.exports = (req, res) => res.json(Tags.getAll());