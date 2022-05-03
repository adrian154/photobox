const {processing} = require("../../config.json");
const metaTags = require("../tags.js");
const sharp = require("sharp");

// tell sharp not to hold onto files for extended periods of time
// this fixes issues with failing to delete temp files on Windows
sharp.cache(false);

// generate an output 'version' from a sharp object
// include the dimensions and content type
const withSize = (image, contentType) => {
    const result = {stream: image, contentType};
    image.on("info", data => {
        result.width = data.width;
        result.height = data.height;
    });
    return result;
};

// we include dimensions on everything, even though currently these fields aren't really used
// this is mainly because A) I feel bad for not reusing withSize() and B) it can't possibly hurt
// it could very well be useful in the future
module.exports = async (filepath, tags) => {

    // read image data
    // .rotate() called with no args rotates the image based on EXIF orientation
    // we set `pages` to 1 to retrieve the page count while not reading the full image
    const image = sharp(filepath, {sequentialRead: true, pages: 1}).rotate();
    const meta = await image.metadata();
    const versions = {type: "image"};

    // always generate a preview
    versions.preview = withSize(image.clone().resize({height: processing.previewHeight}).webp({quality: 50, effort: 6}), "image/webp");

    if(meta.pages > 1) {
        
        // add meta tag
        tags.add(metaTags.VIDEO);

        // create a new Sharp object to read all frames of the animated image
        const fullImage = sharp(filepath, {sequentialRead: true, animated: true}).rotate(); 
        versions.original = withSize(fullImage, "image/" + meta.format); // FIXME: MIME type hack
        versions.duration = meta.delay.reduce((a, c) => a + c, 0) / 1000;

    } else {

        // if the image is too small, generate an upscaled display version
        // we prefer to do this with sharp because it supports the Lanczos kernel, which is usually miles better than whatever shoddy garbage the user's browser uses 
        // similarly, downscale large images to speed up loading 
        if(Math.max(meta.width, meta.height) > processing.maxDisplaySize)
            versions.display = withSize(image.clone().resize({width: processing.maxDisplaySize, height: processing.maxDisplaySize, fit: "inside"}).webp(), "image/webp");
        else if(Math.max(meta.width, meta.height) < processing.minDisplaySize)
            versions.display = withSize(image.clone().resize({width: processing.minDisplaySize, height: processing.minDisplaySize, fit: "inside"}).webp(), "image/webp");
        else
            versions.display = withSize(image.clone().webp(), "image/webp");
        
        versions.original = withSize(image, "image/" + meta.format);
    
    }
    
    return versions;

};
