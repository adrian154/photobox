/*
 * POST /api/collection/create
 * Parameters: JSON
 *     {
 *         name: String,
 *         storageEngine: String
 *     }
 * Response: none
 */
const {Collections} = require("../data-layer.js");

module.exports = (req, res) => {

    if(!req.session) {
        return res.sendStatus(401);
    }

    const name = String(req.body.name);
    const storageEngine = String(req.body.storageEngine);

    if(Collections.get(name)) return res.status(400).json({error: "A collection with that name already exists"});
    if(!req.storageEngines[storageEngine]) return res.status(400).json({error: "No such storage engine"});

    Collections.addPhotobox(name, storageEngine);
    res.json({});

};