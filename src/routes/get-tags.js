/*
 * GET /api/tags
 * Parameters: none
 * Response: (JSON) list of tags 
 */
module.exports = (req, res) => res.json(req.db.getAllTags());