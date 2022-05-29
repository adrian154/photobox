/*
 * GET /api/homepage
 * Parameters: none
 * Response: (JSON) list of collection names
 */
const {Collections} = require("../data-layer.js");
const feeds = require("../feed-providers/feeds.js");

module.exports = (req, res) => {
    res.json(Collections.getAll().map(collection => {
        const feedProvider = feeds[collection.type];
        return feedProvider.getPreview(collection.name);
    }));
};