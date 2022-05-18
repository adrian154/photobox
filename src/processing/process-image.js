const {generatePath} = require("../temp-storage.js");
const {processing} = require("../../config.json");
const metaTags = require("../tags.js");
const sharp = require("sharp");

// tell sharp not to hold onto files after they are done being processed
// this is necessary because windows won't let us delete an in-use file
sharp.cache(false);

// save a sharp stream, return an object including the 
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

// we include dimensions on everything, even though currently these fields aren't really used
// this is mainly because A) I feel bad for not reusing withSize() and B) it can't possibly hurt
// it could very well be useful in the future
module.exports = async (filepath, tags) => {

    // read image data
    // .rotate() called with no args rotates the image based on EXIF orientation
    // we set `pages` to 1 to retrieve the page count while not reading the full image
    const image = sharp(filepath, {sequentialRead: true, pages: 1}).rotate();
    const meta = await image.metadata();

    // image scaling *can* be I/O-bound, so we begin all tasks without waiting for the other ones to complete
    const promises = {};

    // always generate a preview
    promises.preview = save(image.clone().resize({height: processing.previewHeight}).webp({quality: 50, effort: 6}), "image/webp");

    if(meta.pages > 1) {
        
        // add meta tag
        tags.add(metaTags.VIDEO);

        // create a new Sharp object to read all frames of the animated image
        const fullImage = sharp(filepath, {sequentialRead: true, animated: true}).rotate(); 
        promises.original = save(fullImage, MIME(meta.format));
        versions.duration = meta.delay.reduce((a, c) => a + c, 0) / 1000;

    } else {

        // if the image is too small, generate an upscaled display version
        // it's better to do this serverside with Sharp because it usually does a better job of upscaling than the user's browser
        // similarly, very large images are downscaled
        if(Math.max(meta.width, meta.height) > processing.maxDisplaySize)
            promises.display = save(image.clone().resize({width: processing.maxDisplaySize, height: processing.maxDisplaySize, fit: "inside"}).webp(), "image/webp");
        else if(Math.max(meta.width, meta.height) < processing.minDisplaySize)
            promises.display = save(image.clone().resize({width: processing.minDisplaySize, height: processing.minDisplaySize, fit: "inside"}).webp(), "image/webp");
        else
            promises.display = save(image.clone().webp(), "image/webp");
        
        promises.original = save(image, "image/" + meta.format);
    
    }
    
    const [original, display, preview] = await Promise.all([promises.original, promises.display, promises.preview]);
    return {
        type: "image",
        versions: {original, display, preview}
    };

};
