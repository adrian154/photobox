const {Tags} = require("./src/data-layer.js");
const metaTags = require("./src/tags.js");
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
const app = express();
const storageEngines = createStorageEngines(app);

// insert meta tags
for(const tag of Object.values(metaTags)) {
    Tags.add(tag);
}

// serve static files
app.use(express.static("static"));

// --- API stuff
app.use(express.json());

// expose some objects to API route handlers
app.use((req, res, next) => {
    req.storageEngines = storageEngines;
    next();
});

app.get("/api/tags", require("./src/routes/get-tags.js"));
app.put("/api/tags/:tag", require("./src/routes/create-tag.js"));

app.get("/api/homepage", require("./src/routes/get-homepage.js"));
app.get("/api/storage-engines", require("./src/routes/get-storage-engines.js"));

app.get("/api/collections", require("./src/routes/get-collections.js"));
app.post("/api/collections/create", require("./src/routes/create-collection.js"));
app.post("/api/collections/:collection", require("./src/routes/upload.js"));
app.get("/api/collections/:collection", require("./src/routes/get-collection.js"));

app.delete("/api/posts/:post", require("./src/routes/delete-post.js"));
app.put("/api/posts/:post/tags/:tag", require("./src/routes/add-tag-to-post.js"));
app.delete("/api/posts/:post/tags/:tag", require("./src/routes/delete-tag-from-post.js"));


// 500 handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({error: "Internal server error"});
});

app.listen(config.port, () => {
    console.log("Server now listening");
});