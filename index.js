const config = require("./config.json");
const express = require("express");
const busboy = require("busboy");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// make sure temp dir exists
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

// GLOBALS
const db = require("./db.js");
const app = express();

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

const handleUpload = require("./handle-upload.js");

// accept file uploads
app.post("/api/upload", async (req, res) => {

    // unique id for the object
    const id = crypto.randomUUID();

    // parse the form
    const parser = busboy({headers: req.headers});
    req.pipe(parser);

    const filePath = path.join(TEMP_DIR, id);
    const fields = {};
    let failed = false, writeStream = null;

    parser.on("file", (name, stream) => {

        // ignore unrelated fields or duplicates
        if(name !== "file" || writeStream || failed) stream.resume();

        // write to a temporary file
        writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream);
        
        // handle errors gracefully
        writeStream.on("error", error => {

            // log the error
            res.status(400).json({error: "Internal error occurred while saving upload to file"});
            console.error(error);

            // discard rest of stream
            stream.resume();

            // stop handling request
            // set `failed` so that buffered events are ignored
            req.unpipe(parser);
            failed = true;

        });

    });

    parser.on("field", (name, value) => {
        if(failed) return;
        try {
            fields[name] = JSON.parse(value);
        } catch(error) {
            // ignore
        }
    });

    parser.on("close", () => {
        if(!writeStream) req.status(400).json({error: "No file was uploaded"});
        writeStream.on("finish", () => {
            if(!failed) {
                handleUpload(id, filePath, fields);
            }
        }); 
    });

});

app.listen(80, () => {
    console.log("Server now listening");
});