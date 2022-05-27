const {Collections} = require("../data-layer.js");

module.exports = {
    getPreview: name => {
        const post = Collections.getPreviewPost(name);
        return {name, preview: post?.versions.preview.url, numPosts: Collections.getNumPosts(name)};
    },
    getPosts: name => ({posts: Collections.getPosts(name)})
};