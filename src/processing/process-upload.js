/*
 * For every upload, a fixed-height thumbnail needs to be generated.
 * For images, a downscaled display version is generated for faster loading.
 * Videos need to be detected so that their duration metadata can be saved.
 * RAW files need to be converted into displayable images.
 * All of that processing begins here.
 */

const {processing} = require("../../config.json");
const createQueue = require("../queue.js");

const processImage = require("./process-image.js"),
      processVideo = require("./process-video.js"),
      processRaw = require("./process-raw.js");

const IMAGE_EXTENSIONS = ["png", "jpeg", "jpg", "webp", "gif", "apng", "avif"],
      VIDEO_EXTENSIONS = ["mp4", "gifv", "mov", "webm", "avi", "ogv", "m4v"],
      RAW_EXTENSIONS = ["nef", "pef", "raw", "dng", "cr2", "cr3"];

module.exports = createQueue((filePath, originalName, tagSet, tracker) => {
    
    const extension = originalName.split(".").pop().toLowerCase();
    let pipeline = null;
   
    if(IMAGE_EXTENSIONS.includes(extension)) {
        pipeline = processImage;
    } else if(VIDEO_EXTENSIONS.includes(extension)) {
        pipeline = processVideo;
    } else if(RAW_EXTENSIONS.includes(extension)) {
        pipeline = processRaw;
    }

    if(!pipeline) {
        throw new Error("Unrecognized file extension");
    }

    return pipeline(filePath, tagSet, tracker);

}, processing.concurrency);