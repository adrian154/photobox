const ffmpegPath = require("ffmpeg-static");
const metaTags = require("./tags.js");
const sharp = require("sharp");

// tell sharp not to hold onto files for extended periods of time
// this fixes issues with failing to delete temp files on Windows
sharp.cache(false);

const THUMBNAIL_SIZE = 320;

const processAsImage = async (filepath, tags) => {

    const image = sharp(filepath, {sequentialRead: true, animated: true});
    const meta = await image.metadata();
    console.log(meta);

    // pass the original through sharp to strip metadata
    const original = {stream: image, contentType: "image/" + meta.format}; // FIXME: meta.format is not guaranteed to be a MIME type!
    const thumbnail = {stream: image.clone().resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {fit: "inside"}).webp(), contentType: "image/webp"};

    // if the image is animated, skip generation of a display version
    if(meta.pages > 1) {
        tags.add(metaTags.ANIMATED);
        return {original, thumbnail};
    }

    return {
        original,
        display: {stream: image.clone().webp(), contentType: "image/webp"},
        thumbnail
    };

};

const processAsVideo = async filepath => {

    // TODO
    throw new Error("");

};

module.exports = async (filePath, tagSet) => {
    try {
        return await processAsImage(filePath, tagSet);
    } catch(error) {
        console.error(error);
        try {
            return await processAsVideo(filePath, tagSet);
        } catch(error) {
            console.error(error);
            throw new Error("File appears to be neither an image nor a video");
        }
    }
};