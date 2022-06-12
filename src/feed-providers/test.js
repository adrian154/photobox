const posts = require("../../data/saved.json");

module.exports = {
    getPreview: name => ({name, preview: posts[0].versions.preview.url, numPosts: posts.length}),
    getPosts: collection => ({posts})
};