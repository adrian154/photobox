const {ffmpegPath, ffprobePath} = require("ffmpeg-ffprobe-static");
const spawn = require("child_process").spawn;
const config = require("../config.json");
const metaTags = require("./tags.js");
const Queue = require("./queue.js");
const sharp = require("sharp");
const fs = require("fs");

// tell sharp not to hold onto files for extended periods of time
// this fixes issues with failing to delete temp files on Windows
sharp.cache(false);

const PREVIEW_HEIGHT = 480;
const MAX_DISPLAY_SIZE = 1920;

const processAsImage = async (filepath, tags) => {

    const image = sharp(filepath, {sequentialRead: true, animated: true});
    const meta = await image.metadata();

    image.withMetadata({orientation: meta.orientation});

    // pass the original through sharp to strip metadata
    const versions = {type: "image"};
    versions.original = {stream: image, contentType: "image/" + meta.format}; // FIXME: meta.format is not guaranteed to be a MIME type!

    const width = Math.round(meta.width * PREVIEW_HEIGHT / (meta.pageHeight || meta.height));
    versions.preview = {stream: image.clone().resize({width, height: PREVIEW_HEIGHT, fit: "cover"}).webp(), contentType: "image/webp"};
    versions.preview.width = width;
    versions.preview.height = PREVIEW_HEIGHT;

    // if the image is animated, skip generation of a display version
    if(meta.pages > 1) {
        tags.add(metaTags.VIDEO);
    } else {
        versions.display = {stream: image.clone().resize({width: MAX_DISPLAY_SIZE, height: MAX_DISPLAY_SIZE, fit: "inside"}).webp(), contentType: "image/webp"};
    }
    
    return versions;

};

const probe = async filepath => {

    const ffprobe = spawn(ffprobePath, ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filepath]);

    let json  = "";
    ffprobe.stdout.on("data", data => json += data);

    return new Promise((resolve, reject) => {
        ffprobe.on("close", () => {
            try {
                resolve(JSON.parse(json));
            } catch(error) {
                reject(error);
            }
        });
    });

};

const mimeTypes = {
	"avi" : "video/x-msvideo",
	"m4v" : "video/x-m4v",
	"matroska,webm" : "video/webm",
	"mov,mp4,m4a,3gp,3g2,mj2" : "video/mp4",
	"mp4" : "video/mp4",
	"mpeg" : "video/mpeg",
	"mpeg1video" : "video/mpeg",
	"mpeg2video" : "video/mpeg",
	"mpegvideo" : "video/mpeg",
	"ogv" : "video/ogg",
	"webm" : "video/webm"
};

const generatePreview = (filepath, time, originalWidth, originalHeight) => {
    const width = Math.round(originalWidth * PREVIEW_HEIGHT / originalHeight);
    const ffmpeg = spawn(ffmpegPath, ["-i", filepath, "-ss", time, "-vframes", "1", "-filter:v", `scale=${width}:${PREVIEW_HEIGHT}`, "-f", "webp", "-"]);
    return {stream: ffmpeg.stdout, contentType: "image/webp", width, height: PREVIEW_HEIGHT};
};

const processAsVideo = async (filepath, tags) => {

    const data = await probe(filepath);
    
    // ignore images 
    if(data.format?.format_name === "image2" || !mimeTypes[data.format.format_name]) {
        throw new Error("Unsupported format");
    }

    // make sure there's a video stream
    const videoStream = data.streams.find(stream => stream.codec_type === "video"); 
    if(!videoStream) {
        throw new Error("No video stream");
    }

    // tags
    tags.add(metaTags.VIDEO); // (duh)

    if(data.streams.find(stream => stream.codec_type === "audio")) {
        tags.add(metaTags.SOUND);
    }

    // swap video stream dimensions based on rotation
    if(videoStream.tags.rotate == "90" || videoStream.tags.rotate == "-90") [videoStream.width, videoStream.height] = [videoStream.height, videoStream.width];

    return {
        type: "video",
        preview: generatePreview(filepath, Math.floor(videoStream.duration * 0.05), videoStream.width, videoStream.height),
        original: {stream: fs.createReadStream(filepath), contentType: mimeTypes[data.format.format_name]}
    };  

};

const process = async task => {
    try {
        return await processAsImage(task.filePath, task.tagSet);
    } catch(error) {
        return await processAsVideo(task.filePath, task.tagSet);
    }
};

// trying to process uploads as fast as they are received tends to cause exploding memory usage
// limit the number of posts which can be processed concurrently
const queue = new Queue(process, config.processingConcurrency);
module.exports = (filePath, tagSet) => queue.enqueue({filePath, tagSet});