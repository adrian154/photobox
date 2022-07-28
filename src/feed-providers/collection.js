const {Collections} = require("../data-layer.js");

module.exports = {
    getPreview: name => {
        const post = Collections.getPreviewPost(name);
        return {name, preview: post?.versions.thumbnail.url, numPosts: Collections.getNumPosts(name)};
    },
    getPosts: collection => ({posts: Collections.getPosts(collection.name)})
};