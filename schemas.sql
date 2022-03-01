CREATE TABLE IF NOT EXISTS collections (
    name          STRING PRIMARY KEY NOT NULL,
    storageEngine STRING NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
    postid          STRING PRIMARY KEY NOT NULL,
    collection      STRING NOT NULL,
    timestamp       INTEGER NOT NULL,
    thumbnailURL    STRING NOT NULL,
    primaryURL      STRING NOT NULL,
    originalURL     STRING NOT NULL,
    FOREIGN KEY(collection) REFERENCES collections(name)
);

CREATE INDEX posts_timestamp ON posts(timestamp asc);

CREATE TABLE IF NOT EXISTS postTags (
    postid STRING NOT NULL,
    tag    STRING NOT NULL,
    UNIQUE(postid, tag),
    FOREIGN KEY(postid) REFERENCES posts(postid),
    FOREIGN KEY(tag) REFERENCES tags(tag)
);

CREATE TABLE IF NOT EXISTS tags (
    tag STRING PRIMARY KEY NOT NULL 
);