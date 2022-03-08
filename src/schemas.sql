/* for some bizarre reason foreign keys must be enabled */
PRAGMA foreign_keys = ON;

/* there should always be a default collection */
CREATE TABLE IF NOT EXISTS collections (
    name          STRING PRIMARY KEY NOT NULL,
    storageEngine STRING NOT NULL
);

INSERT OR IGNORE INTO collections VALUES ('test', 'local');

CREATE TABLE IF NOT EXISTS posts (
    postid          STRING PRIMARY KEY NOT NULL,
    collection      STRING NOT NULL,
    timestamp       INTEGER NOT NULL,
    displayURL      STRING NOT NULL,
    originalURL     STRING NOT NULL,
    previewURL    STRING NOT NULL,
    previewWidth  INTEGER NOT NULL,
    previewHeight INTEGER NOT NULL,
    FOREIGN KEY(collection) REFERENCES collections(name)
);

/* we'll pretty much always be retrieving posts in date order, so make an index */
CREATE INDEX IF NOT EXISTS posts_timestamp ON posts(timestamp asc);

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