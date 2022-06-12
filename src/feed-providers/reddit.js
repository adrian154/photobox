const fetch = require("node-fetch");
const tags = require("../tags.js");
const {imgurClientID} = require("../../config.json");
const idealPreviewHeight = require("../../config.json").processing.previewHeight;

// reuse imgur item handling code for individual posts and galleries
const processImgurItem = (basePost, item) => {

    // clone base post
    const clone = Object.assign({}, basePost);
    clone.tags = [...basePost.tags, ...item.tags];
    clone.versions = {};
    
    // by adding 'l' to the post id, we can get the thumbnail
    // use the original image's dimensions as the preview dimensions because aspect ratio is all that matters
    // in the future, if we need accurate preview dimensions for some reason, we could calculate the exact size because the 'l' thumbnail is guaranteed to have a height of 640px
    const parts = item.link.split('.');
    parts[parts.length - 2] += "l";
    clone.versions.preview = {
        url: parts.join('.'),
        width: item.width,
        height: item.height
    };

    if(item.mp4) {
        clone.type = "video";
        clone.versions.videoPreview = clone.versions.original = {url: item.mp4, width: item.width, height: item.height};
        clone.tags.push(tags.VIDEO);
        if(item.has_sound) {
            clone.tags.push(tags.SOUND);
        }
    } else {
        clone.type = "image";
        clone.versions.original = {url: item.link, width: item.width, height: item.height};
    }

    return clone;

};

// find the resolution closest to the configured preview height
const getBestResolution = resolutions => {
    
    // post may not have previews
    if(!resolutions) {
        return;
    }

    let bestResolution = null, minDiff = Infinity;
    for(const resolution of resolutions) {
        const diff = Math.abs(resolution.height - idealPreviewHeight);
        if(diff < minDiff) {
            minDiff = diff;
            bestResolution = resolution;
        }
    }
    return bestResolution;

};

// The following logic is a little convoluted because the Reddit API can be less than intuitive; I've done my best to justify everything.
const processPost = async (redditPost) => {

    // ignore self posts
    if(redditPost.post_hint === "self" || redditPost.is_self) {
        return;
    }

    // handle crossposts
    if(redditPost.crosspost_parent_list?.length > 0) {
        redditPost = redditPost.crosspost_parent_list[0];
    }

    // on subreddits where thumbnails are enabled, Reddit provides a set of preview images at various resolutions
    // we prefer the 2nd resolution, falling back on the two lower-res alternatives when not available 
    const redditPreview = getBestResolution(redditPost.preview?.images[0].resolutions);

    // construct a "base post"
    const post = {
        id: redditPost.name,
        timestamp: redditPost.created_utc * 1000,
        srcLink: new URL(redditPost.permalink, "https://reddit.com/").href,
        tags: ["r/" + redditPost.subreddit, "u/" + redditPost.author],
        url: redditPost.url_overridden_by_dest, // include url so that duplicate posts can be filtered
        u: redditPost.author,
        r: redditPost.subreddit,
        versions: {}
    };

    // Handle redgifs
    const redgifsID = redditPost.url_overridden_by_dest?.match(/redgifs.com\/watch\/(\w+)/)?.[1];
    if(redgifsID) {

        const resp = await fetch(`https://api.redgifs.com/v2/gifs/${redgifsID}`);
        const result = await resp.json();
        
        // if `gif` field is missing, gif was deleted/nonexistent
        if(!result.gif) {
            return;
        }

        // if no reddit preview available, use the one provided by redgifs
        // this has the caveat that its true size is not available, but we can use the video size as it'll have the same aspect ratio
        // this horrible practice might come back to bite me in the future when I try to use the preview dimensions in a meaningful way in the client beyond calculating aspect ratio, but whatever
        post.type = "video";
        post.versions.preview = redditPreview || {url: result.gif.urls.thumbnail, width: result.gif.width, height: result.gif.height}; 
        post.versions.videoPreview = {url: result.gif.urls.vthumbnail};
        post.versions.display = {url: result.gif.urls.sd};
        post.versions.original = {url: result.gif.urls.hd, width: result.gif.width, height: result.gif.height};

        // include redgifs tags; also, add audio tag if necessary
        post.tags.push(tags.VIDEO, ...result.gif.tags);
        if(result.gif.hasAudio) {
            post.tags.push(tags.SOUND);
        }

        return post;

    }

    // handle imgur videos
    const imgurVideoID = redditPost.url_overridden_by_dest?.match(/i.imgur.com\/(\w+)\.gifv/)?.[1];
    if(imgurVideoID && imgurClientID) {
        const resp = await fetch(`https://api.imgur.com/3/image/${imgurVideoID}`, {headers: {"Authorization": `Client-ID ${imgurClientID}`}});
        const result = await resp.json();
        return processImgurItem(post, result.data);
    }

    // split imgur galleries into multiple posts
    const imgurGalleryID = redditPost.url_overridden_by_dest?.match(/imgur.com\/a\/(\w+)/)?.[1];
    if(imgurGalleryID && imgurClientID) {
        const resp = await fetch(`https://api.imgur.com/3/album/${imgurGalleryID}`, {headers: {"Authorization": `Client-ID ${imgurClientID}`}});
        const result = await resp.json();
        return result.data.images.map(item => processImgurItem(post, item));
    }

    // handle reddit hosted video
    // pitfall: we can't handle MPEG-DASH/HLS, and the reddit fallback generally doesn't have sound
    if(redditPreview && redditPost.secure_media?.reddit_video) {
        post.type = "video";
        post.tags.push(tags.VIDEO);
        post.versions.preview = redditPreview;
        const redditVideo = redditPost.secure_media.reddit_video;
        post.versions.videoPreview = post.versions.original = {url: redditVideo.fallback_url, width: redditVideo.width, height: redditVideo.height};
        post.duration = redditPost.secure_media.reddit_video.duration;
        return post;
    }

    // handle galleries similarly to regular images
    if(redditPost.gallery_data) {
        // util fn to rename fields in gallery images
        const convert = img => ({url: img.u || img.gif, width: img.x, height: img.y});
        return redditPost.gallery_data.items.map(item => redditPost.media_metadata[item.media_id]).map(item => {
            const clone = Object.assign({}, post);
            clone.type = "image";
            clone.versions = {};
            clone.versions.preview = getBestResolution(item.p.map(convert));
            clone.versions.original = convert(item.s);
            return clone;
        });
    }

    // hopefully, the content can be displayed as an image
    if(redditPreview) {
        post.type = "image";
        post.versions.preview = redditPreview;
        post.versions.original = {url: redditPost.url_overridden_by_dest};
        return post;
    }

    // if no reddit preview is available but the content is an imgur image, handle it accordingly
    // unfortunately, there are still quite a few posts in subreddits with thumbnails disabled that simply cannot be displayed
    const imgurID = redditPost.url_overridden_by_dest?.match(/i.imgur.com\/(\w+)/)?.[1];
    if(imgurID && imgurClientID) {
        const resp = await fetch(`https://api.imgur.com/3/image/${imgurID}`, {headers: {"Authorization": `Client-ID ${imgurClientID}`}});
        const result = await resp.json();
        return processImgurItem(post, result.data);
    }

};

// cache previews 
const previews = {};

const processPosts = async url => {
    const resp = await fetch(url);
    const data = (await resp.json()).data;
    return {
        posts: (await Promise.allSettled(data.children.map(child => processPost(child.data)))).map(result => result.value).filter(Boolean),
        after: data.after
    };
};

module.exports = {
    getPreview: name => ({name, preview: previews[name]}),
    getPosts: async (collection, after) => {

        const url = new URL(collection.feedURL);
        url.searchParams.set("limit", 50);
        url.searchParams.set("raw_json", 1);
        if(after) {
            url.searchParams.set("after", after);
        }

        try {
            const result = await processPosts(url);

            // cache preview
            if(!after) {
                const previewPost = Array.isArray(result.posts[0]) ? result.posts[0][0] : result.posts[0];
                previews[collection.name] = previewPost.versions.preview?.url || previewPost.versions.original?.url;
            }

            return result;
        } catch(err) {
            console.error(err)
            return {posts: []};
        }

    },
    processPosts,
    processPost
};