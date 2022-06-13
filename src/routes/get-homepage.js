/*
 * GET /api/homepage
 * Parameters: none
 * Response: (JSON) list of collection names
 */
const {Collections} = require("../data-layer.js");
const feeds = require("../feed-providers/feeds.js");

module.exports = (req, res) => {

    let collections;
    if(req.session) {
        collections = Collections.getAll();
    } else {
        collections = Collections.getPublic();
    }

    res.json(collections.map(collection => {
        const feedProvider = feeds[collection.type];
        const preview = feedProvider.getPreview(collection.name);
        preview.visibility = collection.visibility;
        return preview;
    }));

};