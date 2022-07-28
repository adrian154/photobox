const posts = require("../../data/saved.json");

module.exports = {
    getPreview: name => ({name, preview: posts[0].versions.thumbnail.url, numPosts: posts.length}),
    getPosts: () => ({posts})
};