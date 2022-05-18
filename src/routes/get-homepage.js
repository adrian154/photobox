/*
 * GET /api/homepage
 * Parameters: none
 * Response: (JSON) list of collection names
 */
const {Collections} = require("../data-layer.js");

module.exports = (req, res) => {
    res.json(Collections.getNames().map(collection => {
        const post = Collections.getPreviewPost(collection);
        return {name: collection, preview: post?.versions.preview.url, numPosts: Collections.getNumPosts(collection)};
    }));
};