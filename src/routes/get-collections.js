/*
 * GET /api/collections
 * Parameters: none
 * Response: (JSON) list of collection names
 */
const {Collections} = require("../data-layer.js");
module.exports = (req, res) => res.json(Collections.getNames());