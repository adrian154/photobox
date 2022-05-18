const {ffmpegPath, ffprobePath} = require("ffmpeg-ffprobe-static");
const {generatePath} = require("../temp-storage.js");
const {processing} = require("../../config.json");
const {spawn} = require("child_process");
const metaTags = require("../tags.js");

const H264_ENCODE_SETTINGS = ["-c:v", "libx264", "-preset", "fast", "-tune", "zerolatency", "-crf", "22"];

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

// restrict the video types which we support
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

const runffmpeg = (...args) => {
    const ffmpeg = spawn(ffmpegPath, args);
    return new Promise((resolve, reject) => {
        ffmpeg.on("error", reject);
        ffmpeg.on("exit", resolve);
    });
};

// generate image preview
const generatePreview = async (filepath, time, originalWidth, originalHeight) => {
    const width = Math.round(originalWidth * processing.previewHeight / originalHeight);
    const path = generatePath();
    await runffmpeg("-i", filepath, "-ss", time, "-vframes", "1", "-filter:v", `scale=${width}:${processing.previewHeight}`, "-c:v", "webp", "-f", "image2", path);
    return {
        path, 
        contentType: "image/webp",
        width,
        height: processing.previewHeight
    };
};

// generate a video version of the preview, a la a certain website...
const generateVideoPreview = async (filepath, length, originalWidth, originalHeight) => {

    // we use a bit of a bitwise 'hack' to round the width to a multiple of 2 (required for H.264 encoding)
    const path = generatePath();
    const width = Math.round(originalWidth * processing.videoPreviewHeight / originalHeight) & 65534;

    // if the video is very short, don't generate clips, just downscale
    if(length < processing.videoPreviewClips * processing.videoPreviewClipLength) {
        await runffmpeg("-i", filepath, "-filter:v", `scale=${width}:${processing.videoPreviewHeight}`, ...H264_ENCODE_SETTINGS, path);
    } else {

        const filtergraph = [];
        const step = (length - 10) / (processing.videoPreviewClips - 1);
        let concatFilterInputs = "";

        for(let i = 0; i < processing.videoPreviewClips; i++) {
            const t = Math.floor(5 + step * i);
            filtergraph.push(`[0:v]trim=${t}:${t + processing.videoPreviewClipLength},setpts=PTS-STARTPTS[v${i}]`);
            concatFilterInputs += `[v${i}]`;
        }

        filtergraph.push(`${concatFilterInputs}concat=n=${processing.videoPreviewClips}:v=1:a=0[out]`, `[out]scale=-2:200[scaled]`);
        await runffmpeg("-i", filepath, "-filter_complex", filtergraph.join('; '), "-map", "[scaled]", ...H264_ENCODE_SETTINGS, "-f", "mp4", path);

    }

    return {
        path,
        contentType: "video/mp4",
        width,
        height: processing.videoPreviewHeight
    }

};

// generate scaled down display version
const generateDisplayVersion = (filepath, meta, videoStream, audioStream) => {
    
    const flags = ["-i", filepath];
    let needsTranscode;

    if(videoStream.codec_name !== "h264") {
        needsTranscode = true;
        flags.push(...H264_ENCODE_SETTINGS);
    } else {
        flags.push("-c:v", "copy");
    }

    if(audioStream.codec_name !== "aac") {
        needsTranscode = true;
        flags.push("-c:a", "aac");
    } else {
        flags.push("-c:a", "copy");
    }

    if(videoStream.height > 480) {
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

    // add tags based on detected media properties
    tags.add(metaTags.VIDEO); // (duh)
    const audioStream = data.streams.find(stream => stream.codec_type === "audio");
    if(audioStream) {
        tags.add(metaTags.SOUND);
    }

    // swap video stream dimensions based on rotation
    if(videoStream.tags.rotate == "90" || videoStream.tags.rotate == "-90") {
        [videoStream.width, videoStream.height] = [videoStream.height, videoStream.width];
    }

    // duration may occur under any one of several properties
    if(videoStream.tags.DURATION) {
        const [hours, minutes, seconds] = videoStream.tags.DURATION.split(":");
        videoStream.duration = Number(hours)*60*60 + Number(minutes)*60 + Number(seconds);
    }

    return {
        type: "video",
        duration: videoStream.duration,
        versions: {
            preview: await generatePreview(filepath, Math.floor(videoStream.duration * 0.15), videoStream.width, videoStream.height),
            videoPreview: await generateVideoPreview(filepath, videoStream.duration, videoStream.width, videoStream.height),
            original: {path: filepath, contentType: mimeTypes[data.format.format_name], width: videoStream.width, height: videoStream.height}
        }
    };

};