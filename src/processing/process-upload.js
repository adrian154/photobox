/*
 * For every upload, a fixed-height thumbnail needs to be generated.
 * For images, a downscaled display version is generated for faster loading.
 * Videos need to be detected so that their duration metadata can be saved.
 * RAW files need to be converted into displayable images.
 * All of that processing begins here.
 */

const {processing} = require("../../config.json");
const Queue = require("../queue.js");

const processImage = require("./process-image.js"),
      processVideo = require("./process-video.js"),
      processRaw = require("./process-raw.js");

// try to infer which processing pipelines are best for a given upload based on file extension
// this might help to speed up processing a little
const IMAGE_FORMATS = ["png", "jpeg", "jpg", "webp", "gif", "apng", "avif"];
const VIDEO_FORMATS = ["mp4", "gifv", "mov", "webm", "avi", "ogv"];
const RAW_FORMATS = ["nef", "pef", "raw", "dng", "cr2", "cr3"];

const process = async task => {

    // unless we're confident a file is a video, always try the video pipeline last
    // otherwise, we risk decoding something that's not a video as a video because of ffprobe's ridiculous promiscuity
    // it's not a real problem because we restrict the formats ffprobe will accept, but it's still a waste of time
    const extension = task.originalName.split('.').pop().toLowerCase();
    const pipelines = IMAGE_FORMATS.includes(extension) ? [processImage, processRaw, processVideo] :
                      VIDEO_FORMATS.includes(extension) ? [processVideo, processImage, processRaw] :
                      RAW_FORMATS.includes(extension) ? [processRaw, processImage, processVideo] :
                      [processImage, processRaw, processVideo];

    for(const pipeline of pipelines) {
        try {
            return pipeline(task.filePath, task.tagSet);
        } catch(err) {
            console.error(err);
            continue;
        }
    }

};

// trying to process uploads as fast as they are received tends to cause exploding memory usage
// limit the number of posts which can be processed concurrently
const queue = new Queue(process, processing.concurrency);
module.exports = (filePath, originalName, tagSet) => queue.enqueue({filePath, originalName, tagSet});