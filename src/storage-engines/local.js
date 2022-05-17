// This storage engine should ONLY be used for testing purposes in its current state!
// There's some *insanely* hacky code in here. It is NOT safe!

const express = require("express");
const path = require("path");
const fs = require("fs");

const DIRECTORY = "data/objects";
if(!fs.existsSync(DIRECTORY)) fs.mkdirSync(DIRECTORY);

module.exports = class {

    constructor(config, app) {
        this.config = config;
        console.log("warning: Local storage engine should only be used for testing purposes!");
        app.use("/local-objects", express.static(DIRECTORY));
    }

    storeFile(name, stream) {
        const outStream = fs.createWriteStream(path.join(DIRECTORY, name));
        stream.pipe(outStream);
        return new Promise(resolve => stream.on("close", resolve));
    }

    async save(id, versions) {

        console.log(versions);
        /*
        const urls = {};

        // huge hack: parse the mimetype to get the file extension
        // it works *most* of the time and i'm tired

        const originalName = `${id}-original.${versions.original.contentType.split('/')[1]}`;
        urls.original = `/local-objects/${originalName}`;
        await this.storeFile(originalName, versions.original.stream);

        const previewName = `${id}-preview.${versions.preview.contentType.split('/')[1]}`;
        urls.preview = `/local-objects/${previewName}`;
        await this.storeFile(previewName, versions.preview.stream);

        if(versions.display) {
            const displayName = `${id}-display.${versions.display.contentType.split('/')[1]}`;
            urls.display = `/local-objects/${displayName}`;
            await this.storeFile(displayName, versions.display.stream);
        }

        return urls;
        */

        throw new Error("not implemented");

    }

    deleteFile(url) {
        
        if(!url) {
            return;
        }

        const filePath = path.join(DIRECTORY, url.split('/').pop());
        return new Promise((resolve, reject) => fs.unlink(filePath, (err) => {
            if(err) {
                console.error("failed to delete temporary file " + filePath);
                console.error(err);
            }
            resolve();
        }));

    }

    async delete(post) {
        await this.deleteFile(post.originalURL);
        await this.deleteFile(post.preview?.url);
        await this.deleteFile(post.displaySrc);       
    }  

};