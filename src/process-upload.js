const {ffmpegPath, ffprobePath} = require("ffmpeg-ffprobe-static");
const spawn = require("child_process").spawn;
const metaTags = require("./tags.js");
const sharp = require("sharp");
const fs = require("fs");

// tell sharp not to hold onto files for extended periods of time
// this fixes issues with failing to delete temp files on Windows
sharp.cache(false);

const PREVIEW_HEIGHT = 320;
const MAX_DISPLAY_SIZE = 1920;

const processAsImage = async (filepath, tags) => {

    const image = sharp(filepath, {sequentialRead: true, animated: true});
    const meta = await image.metadata();

    // pass the original through sharp to strip metadata
    const versions = {};
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

const generatePreview = (filepath, originalWidth, originalHeight) => {
    const width = Math.round(originalWidth * PREVIEW_HEIGHT / originalHeight);
    const ffmpeg = spawn(ffmpegPath, ["-i", filepath, "-ss", "00:00", "-vframes", "1", "-filter:v", `scale=${width}:${PREVIEW_HEIGHT}`, "-f", "webp", "-"]);
    return {stream: ffmpeg.stdout, contentType: "image/webp", width, height: PREVIEW_HEIGHT};
};

const processAsVideo = async (filepath, tags) => {

    const data = await probe(filepath);

    // ignore images 
    if(data.format?.format_name === "image2" || !mimeTypes[data.format.format_name]) {
        throw new Error("Unsupported format"); // no one's gonna see this :^)
    }

    // make sure there's a video stream
    const videoStream = data.streams.find(stream => stream.codec_type === "video"); 
    if(!videoStream) {
        throw new Error("No video stream");
    }

    // tags
    tags.add(metaTags.VIDEO);
    if(data.streams.find(stream => stream.codec_type === "audio")) {
        tags.add(metaTags.SOUND);
    }

    return {
        preview: generatePreview(filepath, videoStream.width, videoStream.height),
        original: {stream: fs.createReadStream(filepath), contentType: mimeTypes[data.format.format_name]}
    };  

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