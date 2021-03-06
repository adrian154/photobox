const fetch = require("node-fetch");
const tags = require("../tags.js");
const {imgurClientID} = require("../../config.json");
const targetThumbnailHeight = require("../../config.json").processing.thumbnailHeight;

// reuse imgur item handling code for individual posts and galleries
const processImgurItem = (basePost, item) => {

    // clone base post
    const clone = Object.assign({}, basePost);
    clone.tags = [...basePost.tags, ...item.tags];
    clone.versions = {};
    
    // use the original image's dimensions as the thumbnail dimensions because aspect ratio is all that matters
    // in the future, if we need accurate thubmnail dimensions for some reason, we could calculate the exact size because the 'l' thumbnail is guaranteed to have a height of 640px
    clone.versions.thumbnail = {
        url: `https://i.imgur.com/${item.id}l.jpg`,
        width: item.width,
        height: item.height
    };

    if(item.mp4) {
        clone.type = "video";
        clone.versions.original = {url: item.mp4, width: item.width, height: item.height, video: true};
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

// find the resolution closest to the configured thumbnail height
const getBestResolution = resolutions => {
    
    // post may not have thumbnails
    if(!resolutions) {
        return;
    }

    let bestResolution = null, minDiff = Infinity;
    for(const resolution of resolutions) {
        const diff = Math.abs(resolution.height - targetThumbnailHeight);
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
    const redgifsID = redditPost.url_overridden_by_dest?.match(/redgifs.com\/watch\/(\w+)/)?.[1] ||
                      redditPost.url_overridden_by_dest?.match(/redgifs.com\/ifr\/(\w+)/)?.[1];
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
        post.versions.thumbnail = redditPreview || {url: result.gif.urls.thumbnail, width: result.gif.width, height: result.gif.height}; 
        post.versions.clips = {url: result.gif.urls.vthumbnail};
        post.versions.HD = {url: result.gif.urls.hd, width: result.gif.width, height: result.gif.height, video: true};
        post.versions.SD = {url: result.gif.urls.sd, video: true};

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
        post.versions.thumbnail = redditPreview;
        const redditVideo = redditPost.secure_media.reddit_video;
        post.versions.original = {url: redditVideo.fallback_url, width: redditVideo.width, height: redditVideo.height, video: true};
        post.meta.duration = {duration: redditPost.secure_media.reddit_video.duration};
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
            clone.versions.thumbnail = getBestResolution(item.p.map(convert));
            clone.versions.original = convert(item.s);
            return clone;
        });
    }

    // post is an imgur link
    const imgurID = redditPost.url_overridden_by_dest?.match(/imgur.com\/(\w+)/)?.[1];
    if(imgurID && imgurClientID) {
        const resp = await fetch(`https://api.imgur.com/3/image/${imgurID}`, {headers: {"Authorization": `Client-ID ${imgurClientID}`}});
        const result = await resp.json();
        return processImgurItem(post, result.data);
    }

    // hopefully, the content can be displayed as an image
    post.type = "image";
    post.versions.thumbnail = redditPreview || {url: redditPost.url_overridden_by_dest};
    post.versions.original = {url: redditPost.url_overridden_by_dest};
    return post;

};

// cache previews 
const previews = {};

const processPosts = async url => {
    const resp = await fetch(url, {
        headers: {"User-Agent": "Photobox"}
    });
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
                previews[collection.name] = previewPost.versions.thumbnail?.url || previewPost.versions.original?.url;
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