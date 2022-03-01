const Database = require("better-sqlite3");
const fs = require("fs");

// load database
const db = new Database("data/site.db");

// create tables
const schemas = fs.readFileSync("schemas.sql", "utf-8");
db.exec(schemas);

// prepare some queries
const queries = {

    // collections
    addCollection: "INSERT INTO collections (name, storageEngine) VALUES (?, ?)",
    getCollection: "SELECT * FROM collections WHERE name = ?",
    
    // post
    addPost: "INSERT INTO posts (postid, collection, timestamp, thumbnailURL, primaryURL, originalURL) VALUES (?, ?, ?, ?, ?, ?)",
    getPost: "SELECT * FROM posts WHERE postid = ?",
    getPostsInCollection: "SELECT * FROM posts WHERE collection = ?",
    deletePost: "DELETE FROM posts WHERE postid = ?",    

    // post tags
    addTagToPost: "INSERT OR ROLLBACK INTO postTags (postid, tag) VALUES (?, ?)",
    removeTagFromPost: "DELETE FROM postTags WHERE postid = ? AND tag = ?",

    // tags
    addTag: "INSERT INTO tags (tag) VALUES (?)"

};

for(const queryname in queries) {
    queries[queryname] = db.prepare(queries[queryname]);
}

module.exports = {

};