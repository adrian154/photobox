// Manage temporary files
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const TEMP_DIR = "tmp";
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

const generateID = () => crypto.randomBytes(18).toString("base64").replaceAll('+', '-').replaceAll('/', '_');

module.exports = srcStream => {

    const id = generateID();
    const filePath = path.join(TEMP_DIR, id);
    const writeStream = fs.createWriteStream(filePath);
    srcStream.pipe(writeStream);
    
    return new Promise((resolve, reject) => {
        writeStream.on("error", error => {
            fs.unlink(filePath, unlinkErr => console.error("Failed to delete temporary file", unlinkErr));
            reject(error);
        });
        writeStream.on("close", () => resolve({id, path: filePath}));
    });

};