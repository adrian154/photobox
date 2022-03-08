const ffmpegPath = require("ffmpeg-static");
const metaTags = require("./tags.js");
const sharp = require("sharp");

// tell sharp not to hold onto files for extended periods of time
// this fixes issues with failing to delete temp files on Windows
sharp.cache(false);

const THUMBNAIL_HEIGHT = 320;
const MAX_DISPLAY_SIZE = 1200;

const processAsImage = async (filepath, tags) => {

    const image = sharp(filepath, {sequentialRead: true, animated: true});
    const meta = await image.metadata();

    // pass the original through sharp to strip metadata
    const versions = {};
    versions.original = {stream: image, contentType: "image/" + meta.format}; // FIXME: meta.format is not guaranteed to be a MIME type!

    const width = Math.round(meta.width * THUMBNAIL_HEIGHT / (meta.pageHeight || meta.height));
    versions.thumbnail = {stream: image.clone().resize({width, height: THUMBNAIL_HEIGHT, fit: "cover"}).webp(), contentType: "image/webp"};
    versions.thumbnail.width = width;
    versions.thumbnail.height = THUMBNAIL_HEIGHT;

    // if the image is animated, skip generation of a display version
    if(meta.pages > 1) {
        tags.add(metaTags.ANIMATED);
    } else {
        const maxDim = Math.min(Math.max(meta.width, meta.height), MAX_DISPLAY_SIZE);
        versions.display = {stream: image.clone().resize({width: maxDim, height: maxDim, fit: "inside"}).webp(), contentType: "image/webp"};
    }
    
    return versions;

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