/*
 * GET /api/storage-engines
 * Response: JSON
 *     [String]
 */
module.exports = (req, res) => res.json(Object.keys(req.storageEngines));