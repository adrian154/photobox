const Database = require("better-sqlite3");
const Table = require("./crud.js");

const db = new Database("data/site.db");
db.pragma("foreign_keys = ON");

// ----- Tables -----

const Collections = new Table(db, "collections", [
    "name STRING PRIMARY KEY NOT NULL",
    "type STRING NOT NULL",
    "storageEngine STRING",
    "feedURL STRING",
    "visibility STRING NOT NULL"
]);

const Tags = new Table(db, "tags", [
    "tag STRING PRIMARY KEY NOT NULL"
]);

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
    "duration REAL",
    "versions STRING NOT NULL",
    "FOREIGN KEY(collection) REFERENCES collections(name)"
]);

db.exec("CREATE INDEX IF NOT EXISTS posts_timestamp ON posts(timestamp)");

const Users = new Table(db, "users", [
    "username STRING NOT NULL PRIMARY KEY",
    "passwordHash STRING NOT NULL",
    "salt STRING NOT NULL"
]);

const Sessions = new Table(db, "sessions", [
    "token STRING NOT NULL",
    "username STRING NOT NULL",
    "FOREIGN KEY(username) REFERENCES users(username)"
]);

// ----- Queries -----

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
Posts.remove = db.transaction(postid => {
    Posts.removeAllTags(postid);
    deletePost(postid);
});

// --- collections
Collections.addPhotobox = Collections.insert({name: "?", type: "'photobox'", storageEngine: "?", visibility: "?"}).fn();
Collections.addReddit = Collections.insert({name: "?", type: "'reddit'", feedURL: "?", visibility: "'private'"}).fn();
Collections.get = Collections.select("*").where("name = ?").fn();
Collections.getAll = Collections.select("*").fn({all: true});
Collections.getPublic = Collections.select("*").where("visibility = 'public'").fn({all: true});
Collections.getNumPosts = Posts.select("COUNT(*)").where("collection = ?").fn({pluck: true});

const getPosts = Posts.select("*").where("collection = ?").orderBy("timestamp DESC").fn({all: true});
const getPreviewPost = Posts.select("*").where("collection = ?").orderBy("timestamp DESC").limit(1).fn();
Collections.getPosts = collection => getPosts(collection).map(rowToPost);
Collections.getPreviewPost = collection => rowToPost(getPreviewPost(collection));

// --- tags
Tags.getAll = Tags.select("tag").fn({all: true, pluck: true});
Tags.add = Tags.insert({tag: "?"}).or("ignore").fn();

// --- users
Users.get = Users.select("*").where("username = ?").fn();
Users.add = Users.insert(["username", "passwordHash", "salt"]).fn();

const removeUser =  Users.delete("username = ?").fn();
Users.remove = db.transaction(username => {
    Sessions.deleteAll(username);
    removeUser(username);
});

// --- sessions
Sessions.get = Sessions.select("*").where("token = ?").fn();
Sessions.add = Sessions.insert(["token", "username"]).fn();
Sessions.remove = Sessions.delete("token = ?").fn();
Sessions.removeAll = Sessions.delete("username = ?").fn();

module.exports = {Collections, Posts, Tags, Users, Sessions};