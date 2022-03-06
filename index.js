const config = require("./config.json");
const express = require("express");

const ENGINES = {
    backblaze: require("./src/storage-engines/backblaze.js"),
    local: require("./src/storage-engines/local.js")
};

const createStorageEngines = app => {
    const engines = {};
    for(const name in config.storageEngines) {
        const properties = config.storageEngines[name];
        const engine = ENGINES[properties.type];
        if(engine) {
            console.log(`Creating storage engine ${name} (${properties.type})`);
            engines[name] = new engine(properties, app);
        } else {
            throw new Error(`Unknown storage engine type "${properties.type}"`);
        }
    }
    return engines;
};

// GLOBALS
const db = require("./src/db.js");
const app = express();
const storageEngines = createStorageEngines(app);

// serve static files
app.use(express.static("static"));

// expose some objects to API route handlers
app.use((req, res, next) => {
    req.db = db;
    req.storageEngines = storageEngines;
    next();
});

app.get("/api/tags", require("./src/routes/get-tags.js"));
app.post("/api/upload", require("./src/routes/upload.js"));

// 404 handler
app.use((req, res, next) => {
    res.status(404).text("You took a wrong turn.");
});

// 500 handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({error: "Internal server error"});
});

app.listen(config.port, () => {
    console.log("Server now listening");
});