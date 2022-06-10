/*
 * GET /api/storage-engines
 * Response: JSON
 *     [String]
 */
module.exports = (req, res) => {
    if(req.session)
        res.json(Object.keys(req.storageEngines));
    else
        res.json([]);
};