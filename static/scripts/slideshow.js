// how far ahead to preload content
const PRELOAD_RANGE = 3;

class Slideshow extends HiddenLayer {

    constructor() {
        
        super("slideshow");
        this.slideshow = document.getElementById("slideshow-content");
        this.posts = [];
        this.renderedPosts = new Set();

        this.slideshow.tabIndex = 0;
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
                if(event.deltaY < 0) left();
                else right();
                event.preventDefault();
            }
        });

        this.observer = new IntersectionObserver(entries => {
            for(const entry of entries) {
                if(entry.isIntersecting) {
                    this.updateContent(entry.target.index);
                }
            }
        }, {root: this.slideshow});

    }

    addPost(post, addToStart) {
        const frame = document.createElement("div");
        frame.classList.add("slideshow-frame");
        post.frame = frame;
        if(addToStart) {
            this.slideshow.prepend(frame);
            post.index = this.posts[0].index - 1;
        } else {
            this.slideshow.append(frame);
            post.index = this.posts[this.posts.length - 1] + 1;
        }
        this.observer.observe(frame);
        this.posts.push(post);
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
            post.frame.append(video);
        } else {
            alert("Unsupported post type");
        }
    }

    updateContent(index) {

        // clear content for frames too far away
        for(const post of this.renderedPosts) {
            if(Math.abs(post.index - index) > PRELOAD_RANGE) {
                post.frame.replaceChildren();
                this.renderedPosts.delete(post);
            }
        }

        // preload posts
        for(let i = -PRELOAD_RANGE; i <= PRELOAD_RANGE; i++) {
            const post = this.posts[index + i];
            if(post && !this.renderedPosts.has(post)) {
                this.populateFrame(post);
                this.renderedPosts.add(post);
            }
        }

    }

    show(post) {
        super.show();
        this.slideshow.focus();
        this.updateContent(post.index);
        post.frame.scrollIntoView();
    }

}