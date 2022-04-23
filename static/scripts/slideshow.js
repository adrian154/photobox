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
        this.dateFormat = new Intl.DateTimeFormat([], {dateStyle: "long"});


        // handle logic
        document.getElementById("handle").addEventListener("click", () => document.getElementById('post-editor').classList.toggle('shown'));

        // delete button logic
        document.getElementById("delete-button").addEventListener("click", () => {
            fetch(`/api/posts/${this.post.id}`, {
                method: "DELETE"
            }).then(resp => {
                if(resp.ok) {
                    slideshow.deletePost(this.post);
                } else {
                    alert("Failed to delete post: HTTP status " + resp.status);
                }
            });
        });

    }

    onTagsLoaded(tags) {
        this.tags = tags;
        this.resetTagPicker();
    }

    resetTagPicker() {
        
        if(this.tagPickerElement) {
            this.tagPickerElement.remove();
        }

        if(this.post) {
            const picker = new LiveTagPicker(this.tagContainer, this.post.id, this.tags, this.post.tags);
            this.tagPickerElement = picker.element;
        }

    }

    update(post) {
        this.post = post;
        this.originalLink.href = post.originalURL;
        this.preview.src = post.preview.url;
        this.postDate.textContent = this.dateFormat.format(new Date(post.timestamp));
        this.collectionLink.textContent = post.collection;
        this.collectionLink.href = `/?collection=${encodeURIComponent(post.collection)}`;
        this.resetTagPicker();
    }

}

class LiveTagPicker extends TagPicker {

    constructor(element, postid, tagList, selectedTags) {
        super(element, tagList, selectedTags);
        this.postid = postid;
    }

    async onTagAdded(tag) {
        const resp = await fetch(`/api/posts/${encodeURIComponent(this.postid)}/tags/${encodeURIComponent(tag)}`, {method: "PUT"}); 
        if(!resp.ok) {
            throw new Error("HTTP status " + resp.status);
        }
    }

    async onTagRemoved(tag) {
        const resp = await fetch(`/api/posts/${encodeURIComponent(this.postid)}/tags/${encodeURIComponent(tag)}`, {method: "DELETE"}); 
        if(!resp.ok) {
            throw new Error("HTTP status " + resp.status);
        }   
    }

}

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

        // observe when a new post becomes visible
        // we use this to trigger post loading
        this.observer = new IntersectionObserver(entries => {
            for(const entry of entries) {
                if(entry.isIntersecting) {
                    editor.update(entry.target.post);
                    this.populateFrames(entry.target.post.index);
                }
            }
        }, {root: this.slideshow, threshold: 0.9});

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
        if(post.type === "image") {
            const img = document.createElement("img");
            img.classList.add("slideshow-centered");
            img.src = post.displaySrc;
            post.frame.append(img);
        } else if(post.type === "video") {
            const video = document.createElement("video");
            video.classList.add("slideshow-centered");
            video.poster = post.preview.url;
            video.controls = true;
            video.loop = true;
            video.src = post.displaySrc;
            video.textContent = "This video can't be played on your browser :(";
            post.frame.append(video);
        } else {
            alert("Unsupported post type");
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