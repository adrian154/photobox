// Local storage backend for Photobox
const fsPromises = require("fs/promises");
const express = require("express");
const path = require("path");
const fs = require("fs");

// create a directory to store objects in
const DIRECTORY = "data/objects";
if(!fs.existsSync(DIRECTORY)) fs.mkdirSync(DIRECTORY);

// warning: MIME type hack (this is horrible)
const getExtension = mimeType => mimeType.split('/')[1];

module.exports = class {

    constructor(config, app) {
        this.config = config;
        app.use("/local-objects", express.static(DIRECTORY));
    }

    async save(tmpFilePath, name, contentType) {

        // to avoid storing MIME types, we let express figure out the correct type at runtime
        // give it a hint through the file extension
        const filename = name + getExtension(contentType);
    
        // the file is already on the disk, we just need to move it to permanent storage
        const filepath = path.join(DIRECTORY, filename);
        await fsPromises.rename(tmpFilePath, filepath);

        // set URL
        return {
            url: "/local-objects/" + filename,
            deleteInfo: filepath // remember path for deletion
        };

    }

    async delete(deleteInfo) {
        return fsPromises.unlink(deleteInfo);
    }  

};