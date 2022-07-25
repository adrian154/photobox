const {generatePath} = require("../temp-storage.js");
const {processing} = require("../../config.json");
const metaTags = require("../tags.js");
const sharp = require("sharp");

// tell sharp not to hold onto files after they are done being processed
// this is necessary because windows won't let us delete an in-use file
sharp.cache(false);

// save a sharp stream, return an object including the output dimensions
const save = async (stream, contentType) => {
    const path = generatePath();
    const info = await stream.toFile(path);
    return {
        path, 
        contentType,
        width: info.width,
        height: info.height,
    };
};

// FIXME: this technically works all the time but it feels incredibly wrong
const MIME = format => "image/" + format;

module.exports = async (filepath, tags) => {

    // read image data
    // .rotate() called with no args rotates the image based on EXIF orientation
    // we set `pages` to 1 to retrieve the page count while not reading the full image
    const image = sharp(filepath, {sequentialRead: true, pages: 1}).rotate();
    const meta = await image.metadata();

    const result = {type: "image", versions: {}};
    result.versions.thumbnail = await save(image.clone().resize({height: processing.thumbnailHeight}).webp({quality: 50, effort: 6}), "image/webp");

    if(meta.pages > 1) {
        
        // add meta tag
        tags.add(metaTags.VIDEO);

        // create a new Sharp object to read all frames of the animated image
        const fullImage = sharp(filepath, {sequentialRead: true, animated: true}).rotate(); 
        result.versions.original = await save(fullImage, MIME(meta.format));
        result.duration = meta.delay.reduce((a, c) => a + c, 0) / 1000;

    } else {

        // small images are upscaled for easier viewing (doing this serverside lets us use better interpolation)
        // large images are downscaled to preserve bandwidth
        const largestSide = Math.max(meta.width, meta.height);
        if(largestSide > processing.image.maxDisplaySize)
            result.versions.display = await save(image.clone().resize({width: processing.image.maxDisplaySize, height: processing.image.maxDisplaySize, fit: "inside"}).webp(), "image/webp");
        else if(largestSide < processing.image.minDisplaySize)
            result.versions.display = await save(image.clone().resize({width: processing.image.minDisplaySize, height: processing.image.minDisplaySize, fit: "inside"}).webp(), "image/webp");
        else
            result.versions.display = await save(image.clone().webp(), "image/webp");
        
        result.versions.original = await save(image, "image/" + meta.format);
    
    }
    
    return result;

};
