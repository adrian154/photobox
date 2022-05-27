// i believe java developers would call this pattern "data access objects"
// just saying that makes me feel a little disgusted, but whatever

const Database = require("better-sqlite3");
const Table = require("./crud.js");

const db = new Database("data/test.db");
db.pragma("foreign_keys = ON");

// tables
const Collections = new Table(db, "collections", [
    "name STRING PRIMARY KEY NOT NULL",
    "type STRING NOT NULL",
    "storageEngine STRING",
    "feedURL STRING"
]);

const PostTags = new Table(db, "postTags", [
    "postid STRING NOT NULL",
    "tag STRING NOT NULL",
    "UNIQUE(postid, tag)",
    "FOREIGN KEY (postid) REFERENCES posts(postid)",
    "FOREIGN KEY (tag) REFERENCES tags(tag)"
]);

// the meaning of `displaySrc` depends on `type`, it's not necessarily a URL!
// `originalURL` doesn't necessarily lead to the same resource, it could be a permalink to the source
const Posts = new Table(db, "posts", [
    "postid STRING PRIMARY KEY NOT NULL",
    "collection STRING NOT NULL",
    "timestamp INTEGER NOT NULL",
    "type STRING NOT NULL",
    "duration REAL",
    "versions STRING NOT NULL",
    "FOREIGN KEY(collection) REFERENCES collections(name)"
]);

db.exec("CREATE INDEX IF NOT EXISTS posts_timestamp ON posts(timestamp)");

const Tags = new Table(db, "tags", [
    "tag STRING PRIMARY KEY NOT NULL"
]);

// FIXME
db.exec("INSERT OR IGNORE INTO collections (name, storageEngine, type) VALUES ('test', 'local', 'photobox')");

// --- posts
const rowToPost = row => {
    if(row) {
        return {
            id: row.postid,
            collection: row.collection,
            timestamp: row.timestamp,
            type: row.type,
            duration: row.duration,
            versions: JSON.parse(row.versions),
            tags: Posts.getTags(row.postid)
        };
    }
};

Posts.addTag = PostTags.insert({postid: "?", tag: "?"}).or("ignore").fn();
Posts.getTags = PostTags.select("tag").where("postid = ?").fn({all: true, pluck: true});
Posts.removeTag = PostTags.delete("postid = ? AND tag = ?").fn();
Posts.removeAllTags = PostTags.delete("postid = ?").fn();

const addPost = Posts.insert(["postid", "collection", "timestamp", "type", "duration", "versions"]).fn();
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
    Posts.removeAllTags(postid);
    deletePost(postid);
};

// --- collections
Collections.add = Collections.insert(["name", "type", "storageEngine", "feedURL"]).fn();
Collections.get = Collections.select("*").where("name = ?").fn();
Collections.getAll = Collections.select("*").fn({all: true});
Collections.getNumPosts = Posts.select("COUNT(*)").where("collection = ?").fn({pluck: true});

const getPosts = Posts.select("*").where("collection = ?").orderBy("timestamp DESC").fn({all: true});
const getPreviewPost = Posts.select("*").where("collection = ?").orderBy("timestamp DESC").limit(1).fn();
Collections.getPosts = collection => getPosts(collection).map(rowToPost);
Collections.getPreviewPost = collection => rowToPost(getPreviewPost(collection));

// --- tags
Tags.getAll = Tags.select("tag").fn({all: true, pluck: true});
Tags.add = Tags.insert({tag: "?"}).or("ignore").fn();

module.exports = {Collections, Posts, Tags};