// how far ahead to preload content
const PRELOAD_RANGE = 3;

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

        // keyboard controls
        this.slideshow.addEventListener("keydown", event => {
            if(event.key === "ArrowLeft") {
                this.left();
                event.preventDefault();
            } else if(event.key === "ArrowRight") {
                this.right();
                event.preventDefault();
            }
        });

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
                    this.onPostVisible(entry.target.post);
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

    onPostVisible(post) {
        document.getElementById("editor-original-link").href = post.originalURL;
        document.getElementById("editor-preview").src = post.preview.url;
    }

    show(post) {

        if(!post) return;

        super.show();
        this.populateFrames(post.index);
        post.frame.scrollIntoView();
        
        // remember which post we're at for desktop incremental controls
        this.index = post.index;

    }

}