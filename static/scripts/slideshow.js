// how far ahead to preload content
const PRELOAD_RANGE = 3;

class PostEditor {

    constructor() {
        
        this.element = document.getElementById("post-editor");
        this.originalLink = document.getElementById("editor-original-link");
        this.preview = document.getElementById("editor-preview");
        this.tagContainer = document.getElementById("editor-tags");
        this.postDate = document.getElementById("editor-post-date");
        this.collectionLink = document.getElementById("editor-collection-link");
        this.userLink = document.getElementById("editor-user-link");
        this.sourceLink = document.getElementById("editor-source-link");
        this.deleteButton = document.getElementById("delete-button");
        this.dateFormat = new Intl.DateTimeFormat([], {dateStyle: "long"});
        
        // handle logic
        document.getElementById("handle").addEventListener("click", () => document.getElementById('post-editor').classList.toggle('shown'));

        // delete button logic
        document.getElementById("delete-button").addEventListener("click", () => {
            fetch(`/api/posts/${this.post.id}`, {
                method: "DELETE"
            }).then(resp => {
                if(resp.ok) {
                    app.slideshow.deletePost(this.post);
                } else {
                    alert("Failed to delete post: HTTP status " + resp.status);
                }
            });
        });

    }

    onInfoReceived(info) {

        this.tags = info.tags;
        if(!info.tags) { 
            document.getElementById("editor-tags").style.display = "none";
        }

        if(!info.signedIn) {
            this.deleteButton.style.display = "none";
        }
    
        this.resetTagPicker();
    }

    onCollectionLoaded(collection) {
        // hide delete button if the collection isn't managed
        if(collection.type !== "photobox") {
            this.deleteButton.style.display = "none";
        }
    }

    resetTagPicker() {
        
        // skip if no taglist 
        if(!this.tags) {
            return;
        }

        if(this.tagPickerElement) {
            this.tagPickerElement.remove();
        }

        if(this.post) {
            const picker = new LiveTagPicker(this.tagContainer, this.post, this.tags, this.post.tags);
            this.tagPickerElement = picker.element;
        }

    }

    update(post) {

        // bring the post into view
        post.photogridContainer.scrollIntoView({block: "center"});

        this.post = post;
        this.originalLink.href = post.versions.original.url;
        this.preview.src = post.versions.preview.url;
        this.postDate.textContent = this.dateFormat.format(new Date(post.timestamp));

        if(post.collection) {
            this.collectionLink.textContent = post.collection;
            this.collectionLink.href = `/?collection=${encodeURIComponent(post.collection)}`;
        } else if(post.r) {
            const link = new URL("/", window.location.origin);
            link.searchParams.set("reddit", 1);
            link.searchParams.set("r", post.r);
            this.collectionLink.textContent = `r/${post.r}`;
            this.collectionLink.href = link;
        }

        if(post.u) {
            const link = new URL("/", window.location.origin);
            link.searchParams.set("reddit", 1);
            link.searchParams.set("u", post.u);
            this.userLink.textContent = `More from u/${post.u}`;
            this.userLink.href = link;
        } else {
            this.userLink.textContent = "";
        }

        if(post.srcLink) {
            this.sourceLink.style.display = "";
            this.sourceLink.href = post.srcLink;
        } else {
            this.sourceLink.style.display = "none";
        }

        this.resetTagPicker();

    }

}

class LiveTagPicker extends TagPicker {

    constructor(element, post, tagList, selectedTags) {
        super(element, tagList, selectedTags);
        this.post = post;
    }

    async onTagAdded(tag) {
        const resp = await fetch(`/api/posts/${encodeURIComponent(this.post.id)}/tags/${encodeURIComponent(tag)}`, {method: "PUT"}); 
        if(!resp.ok) {
            throw new Error("HTTP status " + resp.status);
        }
        this.post.tags.push(tag);
    }

    async onTagRemoved(tag) {
        const resp = await fetch(`/api/posts/${encodeURIComponent(this.post.id)}/tags/${encodeURIComponent(tag)}`, {method: "DELETE"}); 
        if(!resp.ok) {
            throw new Error("HTTP status " + resp.status);
        }   
        this.post.tags.splice(this.post.tags.indexOf(tag), 1);
    }

}

// create <source> elements for videos
const createSource = version => {
    const source = document.createElement("source");
    source.src = version.url;
    if(source.type) source.type = version.contentType;
    return source;
};

class Slideshow extends HiddenLayer {

    constructor() {
        
        super("slideshow");
        this.slideshow = document.getElementById("slideshow-content");

        // the user can hide the slideshow by clicking the background
        // however, we don't want to respond to clicks on the content itself that have bubbled up to the parent
        this.slideshow.addEventListener("click", event => {
            if(event.target == this.slideshow) {
                this.hide();
            }
        });

        // don't try to load all the posts at once, that'd be insane
        // we keep track of which posts are currently displayed in a set
        this.posts = [];
        this.renderedPosts = new Set();

        // close button logic
        this.layer.querySelector(".close-button").addEventListener("click", () => this.hide());

        // scrollwheel nav (desktop)
        this.slideshow.addEventListener("wheel", event => {
            if(event.deltaY != 0) {
                if(event.deltaY < 0)
                    this.left();
                else
                    this.right();
                event.preventDefault();
            }
        });

        this.slideshow.addEventListener("keydown", event => {
            if(event.key === "ArrowLeft") {
                this.left();
                event.preventDefault();
            } else if(event.key === "ArrowRight") {
                this.right();
                event.preventDefault();
            }
        });

        // observe when a new post becomes visible
        // we use this to trigger post loading
        this.observer = new IntersectionObserver(entries => {
            for(const entry of entries) {
                if(entry.intersectionRatio > 0.5) {
                    app.editor.update(entry.target.post);
                    this.populateFrames(entry.target.post.index);
                    this.activateFrame(entry.target);
                } else {
                    this.deactivateFrame(entry.target);
                }
            }
        }, {root: this.slideshow, threshold: [0.9, 0.1]});

    }

    left() { this.show(this.posts[this.index - 1]); }
    right() { this.show(this.posts[this.index + 1]); }

    addPost(post) {

        this.posts.push(post);
        post.index = this.posts.length - 1;

        // create a container for every post
        // this way, we don't need to add/remove elements from the slideshow during normal browsing
        // (which tends to cause jittering and very bizarre behavior as the scroll height of the element changes)
        const frame = document.createElement("div");
        frame.classList.add("slideshow-frame");
        this.slideshow.append(frame);

        post.frame = frame;
        frame.post = post;

        // add the frame to the observer so we receive visibility updates
        this.observer.observe(frame);
    
    }

    deletePost(post) {

        const index = this.posts.indexOf(post);

        // decrement index of all subsequent posts
        this.posts.slice(index + 1, this.posts.length).forEach(post => post.index--);

        // remove the post from the array
        this.posts.splice(index, 1);

        // remove the frame
        post.frame.remove();

        // delete in photogrid, too
        // TODO: this task should really be the responsibility of Photogrid, but since it's so simple we do it here
        post.photogridContainer.remove();

    }

    populateFrame(post) {

        const bgimg = document.createElement("img");
        bgimg.src = post.versions.preview.url;
        bgimg.referrerPolicy = "no-referrer";
        bgimg.classList.add("slideshow-bg");
        post.frame.append(bgimg);

        if(post.type === "image") {
            const img = document.createElement("img");
            img.classList.add("slideshow-centered");
            img.src = post.versions.display?.url || post.versions.original.url;
            img.referrerPolicy = "no-referrer";
            post.frame.append(img);
        } else if(post.type === "video") {

            const versions = {};
            if(post.versions.original) versions["original"] = post.versions.original;
            if(post.versions.display) versions["480p"] = post.versions.display;

            // parent
            const container = document.createElement("div");
            post.frame.player = new VideoPlayer(container, {poster: post.versions.preview.url, versions});
            post.frame.append(container);

        } else {
            alert("Unsupported post type");
            return;
        }

    }

    activateFrame(frame) {
        const video = frame.querySelector("video");
        if(video && new URL(window.location).searchParams.get("autoplay")) {
            //video.play();
        }
    }

    deactivateFrame(frame) {
        const video = frame.querySelector("video");
        if(video) {
            video.pause();
        }
    }

    populateFrames(index) {

        // unload frames that are too far away from the current one
        for(const post of this.renderedPosts) {
            if(Math.abs(post.index - index) > PRELOAD_RANGE) {
                post.frame.replaceChildren();
                this.renderedPosts.delete(post);
            }
        }

        // preload content
        for(let i = index - PRELOAD_RANGE; i <= index + PRELOAD_RANGE; i++) {
            const post = this.posts[i];
            if(post && !this.renderedPosts.has(post)) {
                this.populateFrame(post);
                this.renderedPosts.add(post);
            }
        }

    }

    show(post) {

        if(!post) return;

        super.show();
        this.slideshow.focus();
        document.body.classList.add("no-scrollbar")
        this.populateFrames(post.index);
        post.frame.scrollIntoView();
        
        // remember which post we're at for desktop incremental controls
        this.index = post.index;

    }

    hide() {
        document.body.classList.remove("no-scrollbar");
        super.hide();
    }

}