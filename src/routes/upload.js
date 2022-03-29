/*
 * POST /api/collections/<collection>
 * Parameters: (should be passed as multipart/form-data)
 *     - file: file to upload
 *     - tags: (JSON) array of tags to apply to all uploaded files
 * Response: nothing
 */
const processUpload = require("../processing/process-upload.js");
const storeToTempFile = require("../temporary-storage.js");
const {Collections, Posts} = require("../data-layer.js");
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
    let tempFilePromise;
    const onFile = (name, stream) => {
        if(name === "file" && !tempFilePromise) {
            tempFilePromise = storeToTempFile(stream);
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

    parser.on("close", async () => {
        try {
            resolve({tempFile: await tempFilePromise, fields});
        } catch(error) {
            reject(error);
        }
    });

});

module.exports = async (req, res) => {

    try {

        const collection = Collections.get(String(req.params.collection));
        if(!collection) throw new Error("No such collection");

        const {tempFile, fields} = await readRequest(req);
        if(!tempFile) throw new Error("No file was uploaded");

        const storageEngine = req.storageEngines[collection.storageEngine];
        if(!storageEngine) throw new Error("Storage engine not configured");

        // fields validation
        const tagSet = new Set(JSON.parse(fields.tags));
        const timestamp = Number(fields.timestamp) || Date.now();
        const originalName = String(fields.originalName) || "";

        try {
            
            // process upload
            const versions = await processUpload(tempFile.path, originalName, tagSet);

            // save versions
            const urls = await storageEngine.save(tempFile.id, versions);
            
            // insert into database
            Posts.add({
                postid: tempFile.id,
                collection: collection.name,
                type: versions.type,
                originalURL: urls.original,
                displaySrc: urls.display,
                previewURL: urls.preview,
                previewWidth: versions.preview.width,
                previewHeight: versions.preview.height,
                tags: Array.from(tagSet),
                timestamp,
                duration: versions.duration
            });
            
            // resolve request with the newly added post
            res.status(200).json(Posts.get(tempFile.id));

        } catch(error) {
            console.error(error);
            throw new Error("Internal processing error");
        }

        tempFile.delete();

    } catch(error) {
        console.error(error);
        res.status(400).json({error: error.message}); // FIXME: potential error message exposure!
    }

};
