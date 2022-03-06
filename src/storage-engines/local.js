// This storage engine should ONLY be used for testing purposes!
const express = require("express");
const path = require("path");
const fs = require("fs");

const DIRECTORY = "data/objects";
if(!fs.existsSync(DIRECTORY)) fs.mkdirSync(DIRECTORY);

const resolveOnFinish = stream => new Promise((resolve, reject) => stream.on("close", resolve));

module.exports = class {

    constructor(config, app) {
        this.config = config;
        app.use("/local-objects", express.static(DIRECTORY));
    }

    async save(id, versions) {
        
        const urls = {};
        const promises = [];

        // ultra hacky crap: parse the mimetype to get the file extension
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

        const thumbnailName = `${id}-thumbnail.${versions.thumbnail.contentType.split('/')[1]}`;
        const thumbnail = fs.createWriteStream(path.join(DIRECTORY, thumbnailName));
        promises.push(resolveOnFinish(thumbnail));
        versions.thumbnail.stream.pipe(thumbnail);
        urls.thumbnail = `/local-objects/${thumbnailName}`;

        await Promise.all(promises);
        return urls;

    }

    delete(object) {
        
    }

};