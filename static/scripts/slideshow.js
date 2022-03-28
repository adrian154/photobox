// how far ahead to preload content
const PRELOAD_RANGE = 2;

class Slideshow extends HiddenLayer {

    constructor() {
        
        super("slideshow");
        this.slideshow = document.getElementById("slideshow-content");
        this.posts = [];
        this.renderedPosts = {};
        
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
                    this.updateContent(entry.target.index);
                }
            }
        }, {root: this.slideshow, threshold: 0.9});

    }

    addPost(post) {
        this.posts.push(post);
        return this.posts.length - 1;
    }

    createContent(post) {
        const div = document.createElement("div");
        div.classList.add("slideshow-item");
        if(post.type === "image") {
            const img = document.createElement("img");
            img.classList.add("slideshow-centered");
            img.src = post.displaySrc;
            div.append(img);
        } else if(post.type === "video") {
            const video = document.createElement("video");
            video.classList.add("slideshow-centered");
            video.controls = true;
            video.loop = true;
            video.src = post.displaySrc;
            div.append(video);
        } else {
            alert("Unsupported post type");
        }
        return div;
    }

    // make sure posts remain sorted
    insertContent(content) {
        for(const child of this.slideshow.childNodes) {
            if(child.index > content.index) {
                this.slideshow.insertBefore(content, child);
                return;
            }
        }
        this.slideshow.append(content);
    }

    updateContent(index) {

        console.log("reached: " + index);

        // delete posts that are too far away from the current one
        for(const i in this.renderedPosts) {
            if(Math.abs(i - index) > PRELOAD_RANGE) {
                this.renderedPosts[i].remove();
                delete this.renderedPosts[i];
            }
        }

        // preload posts
        for(let i = -PRELOAD_RANGE; i <= PRELOAD_RANGE; i++) {
            const idx = index + i;
            if(idx >= 0 && idx < this.posts.length && !this.renderedPosts[idx]) {
                const content = this.createContent(this.posts[idx]);
                content.index = idx;
                this.insertContent(content);
                this.observer.observe(content);
                this.renderedPosts[idx] = content;
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
        const content = this.renderedPosts[this.index];
        content.scrollIntoView();

    }

}