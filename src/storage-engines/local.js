// This storage engine should ONLY be used for testing purposes!

const express = require("express");
const path = require("path");
const fs = require("fs");

const DIRECTORY = "data/objects";
if(!fs.existsSync(DIRECTORY)) fs.mkdirSync(DIRECTORY);

const resolveOnFinish = stream => new Promise(resolve => stream.on("close", resolve));

module.exports = class {

    constructor(config, app) {
        this.config = config;
        console.log("warning: Local storage engine should only be used for testing purposes!");
        app.use("/local-objects", express.static(DIRECTORY));
    }

    async save(id, versions) {

        const urls = {};
        const promises = [];

        // huge hack: parse the mimetype to get the file extension
        // it works *most* of the time and i'm tired
        const originalName = `${id}-original.${versions.original.contentType.split('/')[1]}`;
        const original = fs.createWriteStream(path.join(DIRECTORY, originalName));
        promises.push(resolveOnFinish(original));
        versions.original.stream.pipe(original);
        urls.original = `/local-objects/${originalName}`;

        if(versions.display) {
            const displayName = `${id}-display.${versions.display.contentType.split('/')[1]}`;
            const display = fs.createWriteStream(path.join(DIRECTORY, displayName));
            promises.push(resolveOnFinish(display));
            versions.display.stream.pipe(display);
            urls.display = `/local-objects/${displayName}`;
        } else {
            urls.display = urls.original;
        }

        const previewName = `${id}-preview.${versions.preview.contentType.split('/')[1]}`;
        const preview = fs.createWriteStream(path.join(DIRECTORY, previewName));
        promises.push(resolveOnFinish(preview));
        versions.preview.stream.pipe(preview);
        urls.preview = `/local-objects/${previewName}`;

        await Promise.all(promises);
        return urls;

    }

    delete(object) {
        
    }

};