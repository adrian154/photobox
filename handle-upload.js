const ffmpegPath = require("ffmpeg-static");
const sharp = require("sharp");
const fs = require("fs");

const processAsImage = async (filepath, tags) => {

    const image = sharp(filepath, {sequentialRead: true});
    const meta = await image.metadata();

    if(meta.pages > 1) {
        tags.add("animated");
    }

};

const processAsVideo = filepath => {

};

module.exports = async (id, filePath, fields) => {

    const tags = new Set(fields.tags);

    let result;
    try {
        result = await processAsImage(filePath);
    } catch(error) {
        console.error(error); // REMOVE
        try {
            result = await processAsVideo(filePath);
        } catch(error) {
            throw new Error("File appears to be neither an image nor a video");
        }
    }

    // send result to storage engine
    return result;

};