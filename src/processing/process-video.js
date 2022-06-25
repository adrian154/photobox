const {ffmpegPath, ffprobePath} = require("ffmpeg-ffprobe-static");
const {generatePath} = require("../temp-storage.js");
const {processing} = require("../../config.json");
const {spawn} = require("child_process");
const metaTags = require("../tags.js");
const readline = require("readline");

const H264_ENCODE_SETTINGS = ["-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "fast", "-tune", "zerolatency", "-crf", "22"];

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

const runffmpeg = (onProgress, ...args) => {
    args.push("-progress", "pipe:1");
    const ffmpeg = spawn(ffmpegPath, args);
    const reader = readline.createInterface({
        input: ffmpeg.stdout,
        terminal: false
    });
    reader.on("line", line => {
        const microseconds = line.match(/out_time_us=(\d+)/)?.[1];
        if(microseconds && onProgress) {
            onProgress(Number(microseconds));
        }
    });
    return new Promise((resolve, reject) => {
        ffmpeg.on("error", reject);
        ffmpeg.on("exit", resolve);
    });
};

// generate image preview
const generatePreview = async (filepath, time, originalWidth, originalHeight, tracker) => {
    tracker?.begin("Generating thumbnail...");
    const width = Math.round(originalWidth * processing.previewHeight / originalHeight);
    const path = generatePath();
    await runffmpeg(null, "-i", filepath, "-ss", time, "-vframes", "1", "-filter:v", `scale=${width}:${processing.previewHeight}`, "-c:v", "webp", "-f", "image2", path);
    return {
        path, 
        contentType: "image/webp",
        width,
        height: processing.previewHeight
    };
};

// generate a video version of the preview, a la a certain website...
const generateVideoPreview = async (filepath, length, originalWidth, originalHeight, tracker) => {

    tracker?.begin("Generating video preview...");

    // we use a bit of a bitwise 'hack' to round the width to a multiple of 2 (required for H.264 encoding)
    const path = generatePath();
    const width = Math.round(originalWidth * processing.videoPreviewHeight / originalHeight) & 65534;

    // if the video is very short, don't generate clips, just downscale
    const onProgress = us => tracker?.report(us/1e6/length);
    if(length < 1.5 * processing.videoPreviewClips * processing.videoPreviewClipLength) {
        await runffmpeg(onProgress, "-i", filepath, "-filter:v", `scale=${width}:${processing.videoPreviewHeight}`, ...H264_ENCODE_SETTINGS, "-f", "mp4", path);
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
        await runffmpeg(onProgress, "-i", filepath, "-filter_complex", filtergraph.join('; '), "-map", "[scaled]", ...H264_ENCODE_SETTINGS, "-f", "mp4", path);

    }

    return {
        path,
        contentType: "video/mp4",
        width,
        height: processing.videoPreviewHeight
    }

};

// generate a display version
// codecs are selected to maximize compatibility and video is reduced to 480p (or whatever's configured) for mobile vieweing
const generateDisplayVersion = async (filepath, meta, videoStream, audioStream, duration, tracker) => {
    
    const flags = ["-i", filepath];
    let needsTranscode, width;

    if(videoStream.height > processing.videoDisplayHeight) {
        needsTranscode = true;
        width = Math.floor(videoStream.width * processing.videoDisplayHeight / videoStream.height) & 65534;
        flags.push("-filter:v", `scale=${width}:${processing.videoDisplayHeight}`);
    } else {
        width = videoStream.width;
    }

    // we put this block after any filters are added since if the video is modified, we'll need to reencode anyways 
    if(needsTranscode || videoStream.codec_name !== "h264") {
        needsTranscode = true;
        flags.push(...H264_ENCODE_SETTINGS);
    } else {
        flags.push("-c:v", "copy");
    }

    if(audioStream?.codec_name !== "aac") {
        needsTranscode = true;
        flags.push("-c:a", "aac");
    } else {
        flags.push("-c:a", "copy");
    }

    // detect container
    // i guess this makes the "needsTranscode" variable a bit of a misnomer since there are situations where we just copy the streams into a new container but whatever
    // we need to check the major_brand since quicktime MOVs and MP4 are reported as the same format name by ffprobe
    if(meta.format.format_name != "mov,mp4,m4a,3gp,3g2,mj2" || meta.format.tags.major_brand != "isom") {
        needsTranscode = true;        
    }

    flags.push("-f", "mp4");

    if(needsTranscode) {
        const path = generatePath();
        flags.push(path);
        tracker?.begin("Transcoding...");
        await runffmpeg(us => tracker?.report(us/1e6/duration), ...flags);
        return {
            path,
            contentType: "video/mp4",
            width, 
            height: processing.videoDisplayHeight 
        };
    }

};

module.exports = async (filepath, tags, tracker) => {

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
    if(videoStream.tags?.rotate == "90" || videoStream.tags?.rotate == "270" || videoStream.tags?.rotate == "-90") {
        [videoStream.width, videoStream.height] = [videoStream.height, videoStream.width];
    }

    const duration = Number(data.format.duration);

    return {
        type: "video",
        duration,
        versions: {
            preview: await generatePreview(filepath, Math.floor(duration * 0.15), videoStream.width, videoStream.height, tracker),
            videoPreview: await generateVideoPreview(filepath, duration, videoStream.width, videoStream.height, tracker),
            display: await generateDisplayVersion(filepath, data, videoStream, audioStream, duration, tracker),
            original: {path: filepath, contentType: mimeTypes[data.format.format_name], width: videoStream.width, height: videoStream.height}
        }
    };

};