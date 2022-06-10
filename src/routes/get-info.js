const {Tags} = require("../data-layer.js");

module.exports = (req, res) => {
    if(req.session) {
        res.json({
            signedIn: true,
            storageEngines: Object.keys(req.storageEngines),
            tags: Tags.getAll()
        });
    } else {
        res.json({
            signedIn: false
        });
    }
};