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
                this.goto(this.index - 1);
                event.preventDefault();
            } else if(event.key === "ArrowRight") {
                this.goto(this.index + 1);
                event.preventDefault();
            }
        });

        this.observer = new IntersectionObserver(entries => {
            for(const entry of entries) {
                if(entry.isIntersecting) {
                    console.log(entry.target.index);
                    this.updateContent(entry.target.index);
                }
            }
        }, {root: this.slideshow});

    }

    addPost(post) {
        const frame = document.createElement("div");
        frame.classList.add("slideshow-frame");
        post.frame = frame;
        this.slideshow.append(frame);
        this.observer.observe(frame);
        this.posts.push(post);
        post.index = this.posts.length - 1;
        frame.index = post.index;
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

    goto(index) {
        
        // show & focus
        super.show();
        this.slideshow.focus();

        // make sure index is in bounds
        // remember index for use w/ kb controls
        this.index = Math.min(this.posts.length - 1, Math.max(index, 0));
        this.updateContent(index);

        // update slideshow
        this.posts[this.index].frame.scrollIntoView();

    }

}