// this is, in essence, manual object-relational mapping
// is it any better than using regular ORM?
// probably not. but it makes me feel a little better about myself
// which is all that really matters, to be honest

const Database = require("better-sqlite3");
const Table = require("./crud.js");

const db = new Database("data/test.db");
db.pragma("foreign_keys = ON");

const Collections = new Table(db, "collections", [
    "name STRING PRIMARY KEY NOT NULL",
    "storageEngine STRING NOT NULL"
]);

Collections.add = Collections.insert(["name", "storageEngine"]).fn();
Collections.get = Collections.select("*").where("name = ?").fn();
Collections.getNames = Collections.select("name").fn({all: true});

const Tags = new Table(db, "postTags", [
    "postid STRING NOT NULL",
    "tag STRING NOT NULL",
    "UNIQUE(postid, tag)",
    "FOREIGN KEY (postid) REFERENCES posts(postid)",
    "FOREIGN KEY (tag) REFERENCES tags(tag)"
]);

Tags.add = Tags.insert({postid: "?", tag: "?"}).fn();
Tags.get = Tags.select("tag").where("postid = ?").fn({pluck: true});
Tags.remove = Tags.delete("postid = ? AND tag = ?").fn();
Tags.removeAll = Tags.delete("postid = ?").fn();

const Posts = new Table(db, "posts", [
    "postid STRING PRIMARY KEY NOT NULL",
    "collection STRING NOT NULL",
    "timestamp INTEGER NOT NULL",
    "type STRING NOT NULL",
    "display STRING NOT NULL",
    "originalURL STRING NOT NULL",
    "previewURL STRING NOT NULL",
    "previewWidth STRING NOT NULL",
    "previewHeight STRING NOT NULL",
    "FOREIGN KEY(collection) REFERENCES collections(name)"
]);

const addPost = Posts.insert(["postid", "collection", "timestamp", "type", "display", "originalURL", "previewURL", "previewWidth", "previewHeight"]).fn();
Posts.add = post => {
    addPost(post);
    for(const tag of post.tags) {
        Tags.add(post.postid, tag);
    }  
};

const getPost = Posts.select("postid = ?").fn();
Posts.get = postid => {
    const row = getPost(postid);
    row.tags = Tags.get(postid);
    return row;
};

const deletePost = Posts.delete("postid = ?").fn();
Posts.remove = postid => {
    Tags.removeAll(postid);
    deletePost(postid);
};

Posts.getNumPosts = Posts.select("COUNT(*)").where("collection = ?").fn();

module.exports = {Collections, Tags, Posts};