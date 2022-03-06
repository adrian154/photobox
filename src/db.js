const Database = require("better-sqlite3");
const tags = require("./tags.js");
const fs = require("fs");

// load database
const db = new Database("data/site.db");

// create tables
console.log("Creating tables...");
const schemas = fs.readFileSync("src/schemas.sql", "utf-8");
db.exec(schemas);

// prepare some queries
const queries = {

    // collections
    addCollection: db.prepare("INSERT INTO collections (name, storageEngine) VALUES (?, ?)"),
    getCollection: db.prepare("SELECT * FROM collections WHERE name = ?"),
    getCollectionNames: db.prepare("SELECT name FROM collections").pluck(),
    
    // post
    addPostRow: db.prepare("INSERT INTO posts (postid, collection, timestamp, displayURL, originalURL, thumbnailURL, thumbnailWidth, thumbnailHeight) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"),
    addPost: db.transaction((id, collection, urls, thumbnailWidth, thumbnailHeight, tags) => {
        queries.addPostRow.run(id, collection, Date.now(), urls.display, urls.thumbnail, thumbnailWidth, thumbnailHeight, urls.original);
        for(const tag of tags) {
            queries.addTagToPost.run(id, tag);
        }
    }),
    getPost: db.prepare("SELECT * FROM posts WHERE postid = ?"),
    getPostsInCollection: db.prepare("SELECT * FROM posts WHERE collection = ? ORDER BY timestamp ASC"),
    deletePostRow: db.prepare("DELETE FROM posts WHERE postid = ?"),
    deletePost: db.transaction(postid => {
        queries.deleteTagsForPost.run(postid);
        queries.deletePostRow.run(postid);
    }),

    // post tags
    getTags: db.prepare("SELECT tag FROM postTags WHERE postid = ?").pluck(),
    addTagToPost: db.prepare("INSERT INTO postTags (postid, tag) VALUES (?, ?)"),
    removeTagFromPost: db.prepare("DELETE FROM postTags WHERE postid = ? AND tag = ?"),
    deleteTagsForPost: db.prepare("DELETE FROM postTags WHERE postid = ?"),
    deleteTagFromAllPosts: db.prepare("DELETE FROM postTags WHERE tag = ?"),

    // tags
    getAllTags: db.prepare("SELECT tag FROM tags").pluck(),
    addTag: db.prepare("INSERT OR IGNORE INTO tags (tag) VALUES (?)"),
    deleteTagRow: db.prepare("DELETE FROM tags WHERE tag = ?"),
    deleteTag: db.transaction(tag => {
        queries.deleteTagFromAllPosts(tag);
        queries.deleteTagRow(tag);
    })

};

// insert some tags
for(const tag of Object.values(tags)) {
    queries.addTag.run(tag);
}

// the API represents some objects differently from the database schema
// mappings for objects that occur in multiple contexts (like posts) are performed here
// others objects (collections) are translated in the route handling code
// is it bad practice to obfuscate the coupling between the database and the API like that? objectively, yes
// but for now, i don't think it's that important. who knows how bad this code is.
// maybe it will stay like this forever. maybe it'll be refactored in a couple days.
// this message will probably be lost to time.
// if you're reading this: i don't know how you got here, but take a moment to rest and take it all in.

const createPost = (row, tags) => {
    return {
        id: row.id,
        collection: row.collection,
        timestamp: row.timestamp,
        displayURL: row.displayURL,
        originalURL: row.originalURL,
        thumbnail: {
            url: row.thumbnailURL,
            width: row.thumbnailWidth,
            height: row.thumbnailHeight
        },
        tags
    }
};

module.exports = {

    addCollection: collection => queries.addCollection.run(collection.name, collection.storageEngine),
    getCollection: name => queries.getCollection.get(name),
    getCollectionNames: name => queries.getCollections.get(name),
    
    addPost: queries.addPost,
    getPost: postid => createPost(queries.getPost.get(postid), queries.getTags(postid).all()),
    getPosts: collectionName => queries.getPostsInCollection.all(collectionName).map(row => createPost(row, queries.getTags.all(row.postid))),
    deletePost: queries.deletePost,
    
    getTags: postid => queries.getTags.all(postid),
    addTagToPost: (postid, tag) => queries.addTagToPost.run(postid, tag),
    removeTagFromPost: (postid, tag) => queries.removeTagFromPost.run(postid, tag),
    
    getAllTags: () => queries.getAllTags.all(),
    addTag: tag => queries.addTag.run(tag),
    deleteTag: tag => queries.deleteTag.run(tag)

};