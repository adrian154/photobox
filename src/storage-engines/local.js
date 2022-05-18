const fsPromises = require("fs/promises");
const express = require("express");
const path = require("path");
const fs = require("fs");

const DIRECTORY = "data/objects";
if(!fs.existsSync(DIRECTORY)) fs.mkdirSync(DIRECTORY);

// yet another MIME type hack
const extension = mimeType => mimeType.split('/')[1];

module.exports = class {

    constructor(config, app) {
        this.config = config;
        console.log("warning: Local storage engine should only be used for testing purposes!");
        app.use("/local-objects", express.static(DIRECTORY));
    }

    async save(id, versions) {
        for(const versionName in versions) {
            const version = versions[versionName];
            const filename = `${id}-${versionName}.${extension(version.contentType)}`;
            await fsPromises.rename(version.path, path.join(DIRECTORY, filename));
            version.url = "/local-objects/" + filename;
            version.filename = filename;
            delete version.path;
        }
        return versions;
    }

    async delete(post) {
        for(const versionName in post.versions) {
            await fsPromises.unlink(path.join(DIRECTORY, post.versions[versionName].filename))
        }  
    }  

};