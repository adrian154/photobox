/*
 * POST /api/collections/<collection>
 * Parameters: (should be passed as multipart/form-data)
 *     - file: file to upload
 *     - tags: (JSON) array of tags to apply to all uploaded files
 * Response: nothing
 */
const storeToTempFile = require("../temporary-storage.js");
const processUpload = require("../process-upload.js");
const busboy = require("busboy");
const fs = require("fs");

// returns saved file and fields
const readRequest = req => new Promise((resolve, reject) => {

    // parse the form data
    const parser = busboy({headers: req.headers});
    req.pipe(parser);

    const fields = {};
    const onField = (name, value) => fields[name] = value;

    // FIXME: if an error on the writestream occurs before 'close', it goes unhandled
    let tempFile;
    const onFile = (name, stream) => {
        if(name === "file" && !tempFile) {
            tempFile = storeToTempFile(stream);
        } else {
            stream.resume();
        }
    };

    parser.on("field", onField);
    parser.on("file", onFile);
    parser.on("error", error => {
        reject(error);
        parser.removeListener("field", onField);
        parser.removeListener("file", onFile);
    });

    parser.on("close", () => {
        resolve({tempFile: tempFile, fields});
    });

});

module.exports = async (req, res) => {

    const {tempFile, fields} = await readRequest(req);
    if(!tempFile) return res.status(400).json({error: "No file was uploaded"});

    const collection = req.db.getCollection(req.params.collection);
    if(!collection) return res.status(400).json({error: "No such collection"});

    const storageEngine = req.storageEngines[collection.storageEngine];
    if(!storageEngine) return res.status(400).json({error: "Storage engine not configured"});

    try {
        const tagSet = new Set(JSON.parse(fields.tags));
        const versions = await processUpload(tempFile.path, tagSet);
        const urls = await storageEngine.save(tempFile.id, versions);
        req.db.addPost(tempFile.id, collection.name, urls, versions.thumbnail.width, versions.thumbnail.height, Array.from(tagSet));
        res.status(200).json({});
    } catch(error) {
        console.error(error);
        res.status(400).json({error: "Error occurred while processing"});
    }

    fs.unlink(tempFile.path, err => {
        if(err) console.error("Failed to delete temporary file", err);
    });

};
