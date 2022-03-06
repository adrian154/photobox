/*
 * POST /api/upload
 * Parameters: (multipart/form-data)
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
    parser.on("field", onField);

    let tempFilePromise;
    const onFile = (name, stream) => {
        if(name === "file" && !tempFilePromise) {
            tempFilePromise = storeToTempFile(stream);
        } else {
            stream.resume();
        }
    };
    parser.on("file", onFile);

    parser.on("close", () => resolve({fields, tempFilePromise}));
    parser.on("error", error => {
        reject(error);
        parser.removeListener("field", onField);
        parser.removeListener("file", onFile);
    });

});

module.exports = async (req, res) => {

    const {tempFilePromise, fields} = await readRequest(req);
    const tempFile = await tempFilePromise;

    if(!tempFile) return res.status(400).json({error: "No file was uploaded"});

    const collection = req.db.getCollection(fields.collection);
    if(!collection) return res.status(400).json({error: "No such collection"});

    const storageEngine = req.storageEngines[collection.storageEngine];
    if(!storageEngine) return res.status(400).json({error: "Storage engine not configured"});

    try {
        const tagSet = new Set(JSON.parse(fields.tags));
        const versions = await processUpload(tempFile.path, tagSet);
        const urls = await storageEngine.save(tempFile.id, versions);
        req.db.addPost(tempFile.id, collection.name, urls, Array.from(tagSet));
        res.status(200).json({});
    } catch(error) {
        console.error(error);
        res.status(400).json({error: "Error occurred while processing"});
    }

    fs.unlink(tempFile.path, err => {
        if(err) console.error("Failed to delete temporary file", err);
    });

};
