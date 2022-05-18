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

const generateID = () => crypto.randomBytes(12).toString("base64").replaceAll('+', '-').replaceAll('/', '_');

module.exports = {
    generatePath: () => path.join(TEMP_DIR, generateID()),
    storeTempFile: stream => {
        const id = generateID();
        const filePath = path.join(TEMP_DIR, id);
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream);
        return new Promise((resolve, reject) => {
            writeStream.on("error", reject);
            writeStream.on("close", () => resolve({
                id,
                path: filePath
            }));
        });
    }
};