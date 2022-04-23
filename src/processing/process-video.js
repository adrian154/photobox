const {ffmpegPath, ffprobePath} = require("ffmpeg-ffprobe-static");
const {processing} = require("../../config.json");
const {spawn} = require("child_process");
const metaTags = require("../tags.js");
const fs = require("fs");

// call ffprobe to get information about a video
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

// restrict the video types which we support to avoid false positives with images
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
    const width = Math.round(originalWidth * processing.previewHeight / originalHeight);
    const ffmpeg = spawn(ffmpegPath, ["-i", filepath, "-ss", time, "-vframes", "1", "-filter:v", `scale=${width}:${processing.previewHeight}`, "-c:v", "webp", "-f", "image2pipe", "-", "-progress", "pipe:2"]);
    return {stream: ffmpeg.stdout, contentType: "image/webp", width, height: processing.previewHeight};
};

const generateDisplayVersion = (filepath, meta, videoStream, audioStream) => {
    
    const flags = ["-i", filepath];
    let needsTranscode;

    if(videoStream.codec_name !== "h264") {
        needsTranscode = true;
        flags.push("-c:v", "libx264", "-preset", "fast", "-tune", "zerolatency", "-crf", "22");
    } else {
        flags.push("-c:v", "copy");
    }

    if(audioStream.codec_name !== "aac") {
        needsTranscode = true;
        flags.push("-c:a", "aac");
    } else {
        flags.push("-c:a", "copy");
    }

    if(videoStream.height > 720) {
        needsTranscode = true;

    }

    flags.push("-f", "mp4", "-");
    if(needsTranscode) {
        const ffmpeg = spawn(ffmpegPath, flags);
        return {stream: ffmpeg.stdout, contentType: "video/mp4"};
    }

};

module.exports = async (filepath, tags) => {

    const data = await probe(filepath);

    // ignore unsupported types 
    if(!mimeTypes[data.format.format_name]) {
        throw new Error("Unsupported format");
    }

    // make sure there's a video stream
    const videoStream = data.streams.find(stream => stream.codec_type === "video"); 
    if(!videoStream) {
        throw new Error("No video stream");
    }

    // tags
    tags.add(metaTags.VIDEO); // (duh)
    const audioStream = data.streams.find(stream => stream.codec_type === "audio");
    if(audioStream) {
        tags.add(metaTags.SOUND);
    }

    // swap video stream dimensions based on rotation
    if(videoStream.tags.rotate == "90" || videoStream.tags.rotate == "-90") {
        [videoStream.width, videoStream.height] = [videoStream.height, videoStream.width];
    }

    // fix duration
    if(videoStream.tags.DURATION) {
        const [hours, minutes, seconds] = videoStream.tags.DURATION.split(":");
        videoStream.duration = Number(hours)*60*60 + Number(minutes)*60 + Number(seconds);
    }

    const versions = {type: "video", duration: videoStream.duration};
    versions.preview = generatePreview(filepath, Math.floor(videoStream.duration * 0.15), videoStream.width, videoStream.height);
    versions.original = {stream: fs.createReadStream(filepath), contentType: mimeTypes[data.format.format_name], width: videoStream.width, height: videoStream.height};

    // possibly generate a compatibility version
    //versions.display = generateDisplayVersion(filepath, data, videoStream, audioStream);

    return versions;

};