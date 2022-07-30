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

    // print progress to stdout so we can track it
    args.push("-progress", "pipe:1");

    // run the task
    const ffmpeg = spawn(ffmpegPath, args);
    const reader = readline.createInterface({
        input: ffmpeg.stdout,
        terminal: false
    });

    // parse progress info 
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

// generate thumbnail
const generateThumbnail = async (filepath, duration, originalWidth, originalHeight, tracker) => {

    tracker?.begin("Generating thumbnail...");
    
    // calculate dimensions of the output
    const height = processing.thumbnailHeight;
    const width = Math.round(originalWidth * height / originalHeight);
    
    // thumbnail is taken at first 10% of video or 30 seconds, whatever comes first
    const time = Math.min(Math.floor(duration * 0.1), 30);

    const path = generatePath();
    await runffmpeg(null, "-i", filepath, "-ss", time, "-vframes", "1", "-filter:v", `scale=${width}:${processing.thumbnailHeight}`, "-c:v", "webp", "-f", "image2", path);
    return {
        path, 
        contentType: "image/webp",
        width,
        height
    };

};

// generate a video version of the preview, a la a certain website...
const generateClips = async (filepath, length, tracker) => {
    
    const onProgress = us => tracker?.report(us/1e6/length);
    const path = generatePath();
    tracker?.begin("Generating clips...");

    // stepSize = time between the start of each clip
    const stepSize = (length - processing.video.clipLength) / processing.video.numClips;

    // if there are less than 10 seconds between clips, just downscale
    if(stepSize - processing.video.clipLength < 10) {
        await runffmpeg(onProgress, "-i", filepath, "-filter:v", `scale=-2:${processing.video.clipHeight}`, ...H264_ENCODE_SETTINGS, "-f", "mp4", path);
    } else {

        const filtergraph = [];
        let concatFilterInputs = "";

        for(let i = 0; i < processing.numClips; i++) {
            const t = i * stepSize;
            filtergraph.push(`[0:v]trim=${t}:${t + processing.clipLength},setpts=PTS-STARTPTS[v${i}]`);
            concatFilterInputs += `[v${i}]`;
        }

        filtergraph.push(`${concatFilterInputs}concat=n=${processing.video.numClips}:v=1:a=0[out]`, `[out]scale=-2:200[scaled]`);
        await runffmpeg(onProgress, "-i", filepath, "-filter_complex", filtergraph.join('; '), "-map", "[scaled]", ...H264_ENCODE_SETTINGS, "-f", "mp4", path);

    }

    return {
        path,
        contentType: "video/mp4"
    }

};

// generate a video version at a certain resolution
const generateResolution = async (filepath, meta, videoStream, audioStream, duration, height, tracker) => {
    
    const flags = ["-i", filepath];
    let needsTranscode = false;

    // if the original video is smaller than the requested resolution, exit
    if(videoStream.height < height) {
        return;
    }

    // if the video stream is already the right height and is also H.264, no need to transcode
    if(videoStream.height == height && videoStream.codec_name === "h264") {
        flags.push("-c:v", "copy");
    } else {
        flags.push("-filter:v", `scale=-2:${height}`);
        needsTranscode = true;
    }

    // re-encode audio if not AAC
    if(audioStream) {
        if(audioStream.codec_name === "aac") {
            flags.push("-c:a", "copy");
        } else {
            flags.push("-c:a", "aac");
            needsTranscode = true;
        }
    }

    // make sure the container is MP4
    // this technically makes `needsTranscode` a bit of a misnomer since there may be situations where we copy both streams into a new container
    if(meta.format.format_name != "mov,mp4,m4a,3gp,3g2,mj2" || meta.format.tags.major_brand != "isom") {
        needsTranscode = true; 
    }

    // always output MP4
    flags.push("-f", "mp4");

    if(needsTranscode) {
        const path = generatePath();
        flags.push(path);
        tracker?.begin(`Generating ${height}p...`);
        await runffmpeg(us => tracker?.report(us/1e6/duration), ...flags);
        return {
            path,
            contentType: "video/mp4",
            video: true
        };
    }

};

module.exports = async (filepath, tags, tracker) => {

    const data = await probe(filepath);

    // ignore unsupported types 
    const mimeType = mimeTypes[data.format.format_name];
    if(!mimeType) {
        throw new Error("Unsupported format");
    }

    // make sure there's a video stream
    const videoStream = data.streams.find(stream => stream.codec_type === "video"); 
    if(!videoStream) {
        throw new Error("No video stream");
    }

    // add tags based on detected media properties
    tags.add(metaTags.VIDEO);
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
        meta: {
            duration
        },
        versions: {
            "thumbnail": await generateThumbnail(filepath, duration, videoStream.width, videoStream.height, tracker),
            "clips": await generateClips(filepath, duration, tracker),
            "480p": await generateResolution(filepath, data, videoStream, audioStream, duration, 480, tracker),
            "720p": await generateResolution(filepath, data, videoStream, audioStream, duration, 720, tracker),
            "1080p": await generateResolution(filepath, data, videoStream, audioStream, duration, 1080, tracker), 
            "original": {path: filepath, contentType: mimeType, video: true}
        }
    };

};