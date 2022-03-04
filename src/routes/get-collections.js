/*
 * GET /api/collections
 * Parameters: none
 * Response: (JSON) list of collection names
 */
module.exports = (req, res) => res.json(req.db.getCollections());