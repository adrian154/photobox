/*
 * POST /api/upload
 * Parameters: (multipart/form-data)
 *     - file: file to upload
 *     - tags: (JSON) array of tags to apply to all uploaded files
 * Response: nothing
 */
const ffmpegPath = require("ffmpeg-static");
const metaTags = require("../tags.js");
const busboy = require("busboy");
const crypto = require("crypto");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// manage temporary storage
const TEMP_DIR = "./tmp";
if(!fs.existsSync(TEMP_DIR)) {
    console.log("Creating temporary directory...");
    fs.mkdirSync(TEMP_DIR);
} else {
    for(const dirent of fs.readdirSync(TEMP_DIR, {withFileTypes: true})) {
        if(!dirent.isDirectory()) {
            console.warn(`warning: deleting "${dirent.name}" from temporary folder`);
            fs.unlinkSync(path.join(TEMP_DIR, dirent.name));
        }
    }
}

const processAsImage = async (filepath, tags) => {

    const image = sharp(filepath, {sequentialRead: true, animated: true});
    const meta = await image.metadata();
    console.log(meta);

    if(meta.pages > 1) {
        tags.add(metaTags.ANIMATED);
    }

    // converting lossy jpeg to lossless webp creates issues, avoid that
    const versions = {};
    versions.original = meta.format === "jpeg" ? image.clone() : image.clone().webp({lossless: true, effort: 6}); 
    versions.display = image.clone().webp()
    versions.thumbnail = image.clone().resize(100, 100, {fit: "inside"}).webp();
    return versions;

};

const processAsVideo = async filepath => {

    // TODO

};

const processUpload = async (filePath, tagSet) => {
    try {
        return await processAsImage(filePath, tagSet);
    } catch(error) {
        try {
            return await processAsVideo(filePath, tagSet);
        } catch(error) {
            throw new Error("File appears to be neither an image nor a video");
        }
    }
};

module.exports = (req, res) => {

    // the file will be saved to a temporary file
    const id = crypto.randomUUID();
    const filePath = path.join(TEMP_DIR, id);

    // parse incoming data
    const parser = busboy({headers: req.headers});
    req.pipe(parser);

    // state
    const fields = {};
    let writeStream = null, failed = false;

    // error handling
    const fail = message => {
        failed = true;
        req.unpipe(parser);
        res.status(400).json({error: message});
    };

    parser.on("file", (name, stream) => {
        if(name === "file" && !failed) {
            writeStream = fs.createWriteStream(filePath);
            writeStream.on("error", error => {
                console.error(error);
                stream.resume();
                fail("Internal error occurred while saving upload");
            });
            stream.pipe(writeStream);
        } else {
            stream.resume();
        }
    });

    parser.on("field", (name, value) => {
        if(!failed) {
            fields[name] = value;
        }
    });

    parser.on("close", () => {
        if(!writeStream) res.status(400).json({error: "No file was uploaded"});
        writeStream.on("finish", () => {
            if(!failed) {
                try {
                    const versions = processUpload(filePath, fields);
                    res.sendStatus(200);
                    // TODO: send off to storage engines
                } catch(error) {
                    res.status(400).json({error: "Error occurred while processing"});
                }
            }
        });
    });

};
