const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const config = require("./config.json");
const express = require("express");
const crypto = require("crypto");
const busboy = require("busboy");
const stream = require("stream");
const sharp = require("sharp");

// GLOBALS
const db = require("./db.js");
const app = express();

// helpers
const generateID = async () => new Promise((resolve, reject) => crypto.randomBytes(16, (err, buf) => {
    if(err) reject(err);
    resolve(buf.toString("base64url"));
}));

// initialize storage engines
const STORAGE_ENGINES = require("./storage-engines/engines.js");
const storageEngines = {};

for(const engineName in config.storageEngines) {
    const engineConfig = config.storageEngines[engineName];
    const engine = STORAGE_ENGINES[engineConfig.type];
    if(engine) {
        console.log(`Initializing ${engineName} (${engineConfig.type})...`);
        storageEngines[engineName] = new engine(engineConfig);
    } else {
        throw new Error(`Unknown storage engine type "${engineConfig.type}"`);
    }
}

// serve static files
app.use(express.static("static"));

// temporary testing route
app.get("/api/tags", (req, res) => res.json(db.getAllTags()));

// accept file uploads
app.post("/api/upload", async (req, res) => {

    // unique id for the object
    const id = await generateID();

    // parse the form
    const parser = busboy({headers: req.headers});
    req.pipe(parser);

    // if something has gone wrong, ignore further events
    let failed = false;

    parser.on("file", (name, stream) => {

        // ignore unrelated fields
        if(name !== "file" || failed) stream.resume();

        // we don't know what type the content is, and guessing based on extension is unreliable
        // solution: pipe to both ffprobe and sharp, see which fails first
        let isImage = false;

        // three versions of the image are saved:
        // * lossless copy, for archival purposes
        //     * if the original is a JPEG, it is saved as-is
        //     * other formats are converted to WebP
        // * lossy full-res copy, which is actually viewed
        // * 100x100 thumbnail
        const primaryPipeline = sharp({sequentialRead: true}).webp();
        const thumbnailPipeline = sharp({sequentialRead: true}).resize(300, 300, {fit: "inside"}).webp({effort: 3});

    });

    let tags;
    parser.on("field", (name, value) => {
        if(name === "tags" && !failed) {
            tags = JSON.parse(value);
        }
    });

    parser.on("close", () => {
        if(!failed) {

            

        }
    });

    /*
    // check if the file is an image first
    const image = sharp(req.file.buffer);
    let isImage = true;
    try {
        await image.stats();
    } catch(error) {
        isImage = false;
    }

    if(isImage) {

        const meta = await image.metadata();
        const object = {id: generateID()};

        // for archival purposes, an original is saved
        // if the original is a JPEG, it is saved as-is
        // if the original is PNG/other, it is saved as a lossless WebP
        if(meta.format === "jpeg") {
            object.originalVersion = image;
        } else {
            object.originalVersion = image.clone().webp({lossless: true``});
        }

        // a lossy full-res version is encoded in WebP
        object.primaryVersion = image.clone().webp({quality: 80});

        // a 128x128 thumbnail is encoded in WebP
        object.thumbnailVersion = image.clone().resize(100, 100, {fit: "inside"});

    } else {

        // try to generate a thumbnail
        try {
            
            // get correct size
            const metadata = await new Promise((resolve, reject) => ffmpeg.ffprobe(stream.Readable.from(req.file.buffer), (err, metadata) => {
                if(err) reject(err);
                resolve(metadata);
            }));

            const videoStream = metadata.streams.find(stream => stream.width && stream.height);
            
            // figure out the correct resolution
            const maxDim = Math.max(videoStream.width, videoStream.height);
            const scale = 100 / maxDim;

            ffmpeg(stream.Readable.from(req.file.buffer))
                            .screenshots({count: 1, size: `${Math.floor(scale * videoStream.width)}x${Math.floor(scale * videoStream.height)}`, timestamps: [0]})
                            .on("end", () => console.log("done"));

        } catch(error) {
            console.error(error);
            res.status(400).json({error: "The contents of the file weren't recognized as any image or video format"});
        }

    }
    */

});

app.listen(80, () => {
    console.log("Server now listening");
});