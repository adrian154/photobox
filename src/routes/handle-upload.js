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

// tell sharp not to hold onto files for extended periods of time
// this fixes issues with failing to delete temp files on Windows
sharp.cache(false);

const THUMBNAIL_SIZE = 256;

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

    const thumbnail = {stream: image.clone().resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {fit: "cover"}).webp(), contentType: "image/webp"};

    // if the image is animated (gif/webm), do no further processing
    if(meta.pages > 1) {
        tags.add(metaTags.ANIMATED);
        return {
            original: {stream: image, contentType: "image/" + meta.format}, // FIXME: meta.format is not necessarily a MIME type!
            display: null,
            thumbnail
        };
    }

    // avoid converting JPEGs to lossless webp
    return {
        original: meta.format === "jpeg" ? {stream: image.clone(), contentType: "image/jpeg"} : {stream: image.clone().webp({lossless: true}), contentType: "image/webp"},
        display: {stream: image.clone().webp(), contentType: "image/webp"},
        thumbnail
    };

};

const processAsVideo = async filepath => {

    // TODO
    throw new Error("Video processing isn't implemented yet.");

};

const processUpload = async (filePath, tagSet) => {
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
        if(writeStream) {
            fs.unlink(filePath, err => {
                if(err) console.error("Failed to delete temporary file: ", err); // FIXME: DRY
            });
        }
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
        writeStream.on("finish", async () => {
            if(!failed) {
                
                process: try {

                    const collection = req.db.getCollection(fields.collection);
                    if(!collection) {
                        res.status(400).json({error: "No such collection", stopUpload: true});
                        break process;
                    }
                    
                    const storageEngine = req.storageEngines[collection.storageEngine];
                    if(!storageEngine) {
                        res.status(400).json({error: "Storage engine not configured", stopUpload: true});
                        break process;
                    }

                    const tagSet = new Set(JSON.parse(fields.tags));
                    const versions = await processUpload(filePath, tagSet);
                    const urls = await storageEngine.save(id, versions);
                    req.db.addPost(id, fields.collection, urls, Array.from(tagSet));
                    res.json({}); // uploader expects json response

                } catch(error) {
                    console.error(error);
                    res.status(400).json({error: "Error occurred while processing"});
                }

                // remove the temp file
                fs.unlink(filePath, err => {
                    if(err) console.error("Failed to delete temporary file: ", err); // FIXME: DRY
                })

            }
        });
    });

};
