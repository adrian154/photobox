/*
 * POST /api/collection/create
 * Parameters: JSON
 *     {
 *         name: String,
 *         storageEngine: String
 *     }
 * Response: none
 */
module.exports = (req, res) => {

    const name = String(req.body.name);
    const storageEngine = String(req.body.storageEngine);

    if(req.db.getCollection(name)) return res.status(400).json({error: "A collection with that name already exists"});
    if(!req.storageEngines[storageEngine]) return res.status(400).json({error: "No such storage engine"});

    req.db.addCollection({name, storageEngine});
    res.json({});

};