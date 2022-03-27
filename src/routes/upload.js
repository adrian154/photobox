/*
 * POST /api/collections/<collection>
 * Parameters: (should be passed as multipart/form-data)
 *     - file: file to upload
 *     - tags: (JSON) array of tags to apply to all uploaded files
 * Response: nothing
 */
const storeToTempFile = require("../temporary-storage.js");
const {Collections, Posts} = require("../data-layer.js");
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
        const timestamp = Number(fields.timestamp);
        if(!timestamp) throw new Error("Invalid timestamp");

        // process and send to the storage engine
        try {
            const versions = await processUpload(tempFile.path, tagSet);
            const urls = await storageEngine.save(tempFile.id, versions);
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
            res.status(200).json(Posts.get(tempFile.id));
        } catch(error) {
            console.error(error);
            throw new Error("Internal processing error");
        }

        fs.unlink(tempFile.path, err => {
            if(err) console.error("Failed to delete temporary file", err);
        });

    } catch(error) {
        console.error(error);
        res.status(400).json({error: error.message}); // FIXME: potential error message exposure!
    }

};
