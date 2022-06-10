/*
 * POST /api/collections/<collection>
 * Parameters: (should be passed as multipart/form-data)
 *     - file: file to upload
 *     - tags: (JSON) array of tags to apply to all uploaded files
 * Response: nothing
 */
const processUpload = require("../processing/process-upload.js");
const {Collections, Posts} = require("../data-layer.js");
const {storeTempFile} = require("../temp-storage.js");
const busboy = require("busboy");

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
            tempFilePromise = storeTempFile(stream);
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
            const result = await processUpload(tempFile.path, originalName, tagSet);
            const versions = await storageEngine.save(tempFile.id, result.versions);

            // insert into database
            Posts.add({
                postid: tempFile.id,
                collection: collection.name,
                type: result.type,
                duration: result.duration,
                versions: JSON.stringify(versions),
                tags: Array.from(tagSet),
                timestamp
            });
            
            // resolve request with the newly added post
            res.status(200).json(Posts.get(tempFile.id));

        } catch(error) {
            console.error(error);
            throw new Error("Processing failed");
        }

    } catch(error) {
        console.error(error);
        res.status(400).json({error: error.message}); // FIXME: potential error message exposure!
    }

};
