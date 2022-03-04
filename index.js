const config = require("./config.json");
const express = require("express");

// GLOBALS
const storageEngines = require("./src/storage-engines/engines.js");
const db = require("./src/db.js");
const app = express();

// serve static files
app.use(express.static("static"));

// expose some objects to API route handlers
app.use((req, res, next) => {
    req.db = db;
    req.storageEngines = storageEngines;
    next();
});

app.get("/api/tags", require("./src/routes/get-tags.js"));
app.post("/api/upload", require("./src/routes/handle-upload.js"));

app.listen(config.port, () => {
    console.log("Server now listening");
});