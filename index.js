const config = require("./config.json");
const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");

// helpers
const generateID = async () => new Promise((resolve, reject) => crypto.randomBytes(16, (err, buf) => {
    if(err) reject(err);
    resolve(buf.toString("base64url"));
}));

// app objects
const app = express();
const upload = multer({storage: multer.memoryStorage()});

// serve static files
app.use(express.static("static"));

// temporary testing route
app.get("/api/tags", (req, res) => res.json(["a", "b", "c"]));

// accept file uploads
app.post("/api/upload", upload.single("file"), async (req, res) => {

    const image = sharp(req.file.buffer);
    const meta = await image.metadata();
    const id = await generateID();

    // for archival purposes, an original is saved
    // if the original is a JPEG, it is saved as-is
    // if the original is PNG/other, it is saved as a lossless WebP
    if(meta.format === "jpeg") {
        
    }

    // a lossy full-res version is encoded in WebP

    // a 128x128 thumbnail is encoded in WebP

});

app.listen(80, () => {
    console.log("Server now listening");
});