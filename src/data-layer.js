// i believe java developers would call this pattern "data access objects"
// just saying that makes me feel a little disgusted, but whatever

const Database = require("better-sqlite3");
const Table = require("./crud.js");

const db = new Database("data/test.db");
db.pragma("foreign_keys = ON");

// tables
const Collections = new Table(db, "collections", [
    "name STRING PRIMARY KEY NOT NULL",
    "storageEngine STRING NOT NULL"
]);

// FIXME
db.exec("INSERT OR IGNORE INTO collections (name, storageEngine) VALUES ('test', 'local')");

const PostTags = new Table(db, "postTags", [
    "postid STRING NOT NULL",
    "tag STRING NOT NULL",
    "UNIQUE(postid, tag)",
    "FOREIGN KEY (postid) REFERENCES posts(postid)",
    "FOREIGN KEY (tag) REFERENCES tags(tag)"
]);

const Posts = new Table(db, "posts", [
    "postid STRING PRIMARY KEY NOT NULL",
    "collection STRING NOT NULL",
    "timestamp INTEGER NOT NULL",
    "type STRING NOT NULL",
    "displaySrc STRING NOT NULL",
    "duration REAL",
    "originalURL STRING NOT NULL",
    "previewURL STRING NOT NULL",
    "previewWidth STRING NOT NULL",
    "previewHeight STRING NOT NULL",
    "FOREIGN KEY(collection) REFERENCES collections(name)"
]);

const Tags = new Table(db, "tags", [
    "tag STRING PRIMARY KEY NOT NULL"
]);

db.exec("CREATE INDEX IF NOT EXISTS posts_timestamp ON posts(timestamp)");

// --- posts
const rowToPost = row => {
    if(row) {
        return {
            id: row.postid,
            collection: row.collection,
            timestamp: row.timestamp,
            type: row.type,
            displaySrc: row.displaySrc,
            duration: row.duration,
            originalURL: row.originalURL,
            preview: {
                url: row.previewURL,
                width: row.previewWidth,
                height: row.previewHeight
            },
            tags: Posts.getTags(row.postid)
        };
    }
};

Posts.addTag = PostTags.insert({postid: "?", tag: "?"}).or("ignore").fn();
Posts.getTags = PostTags.select("tag").where("postid = ?").fn({all: true, pluck: true});
Posts.removeTag = PostTags.delete("postid = ? AND tag = ?").fn();
Posts.removeAllTags = PostTags.delete("postid = ?");

const addPost = Posts.insert(["postid", "collection", "timestamp", "type", "displaySrc", "originalURL", "previewURL", "previewWidth", "previewHeight", "duration"]).fn();
Posts.add = db.transaction(post => {
    addPost(post);
    for(const tag of post.tags) {
        Posts.addTag(post.postid, tag);
    }  
});

const getPost = Posts.select("*").where("postid = ?").fn();
Posts.get = postid => rowToPost(getPost(postid));

const deletePost = Posts.delete("postid = ?").fn();
Posts.remove = postid => {
    Tags.removeAll(postid);
    deletePost(postid);
};

// --- collections
Collections.add = Collections.insert(["name", "storageEngine"]).fn();
Collections.get = Collections.select("*").where("name = ?").fn();
Collections.getNames = Collections.select("name").fn({all: true, pluck: true});
Collections.getNumPosts = Posts.select("COUNT(*)").where("collection = ?").fn({pluck: true});

const getPosts = Posts.select("*").where("collection = ?").orderBy("timestamp ASC").fn({all: true});
const getPreviewPost = Posts.select("*").where("collection = ?").orderBy("timestamp DESC").limit(1).fn();
Collections.getPosts = collection => getPosts(collection).map(rowToPost);
Collections.getPreviewPost = collection => rowToPost(getPreviewPost(collection));

// --- tags
Tags.getAll = Tags.select("tag").fn({all: true, pluck: true});
Tags.add = Tags.insert({tag: "?"}).or("ignore").fn();

module.exports = {Collections, Posts, Tags};