// preload some content
const PRELOAD_RANGE = 2;

class Slideshow extends HiddenLayer {

    constructor() {
        
        super("slideshow");
        this.slideshow = document.getElementById("slideshow-content");
        this.posts = [];
        this.postContents = {};
        
        this.slideshow.tabIndex = 0;

        this.layer.querySelector(".close-button").addEventListener("click", () => this.hide());
        this.slideshow.addEventListener("keydown", event => {
            if(event.key === "ArrowLeft") {
                this.goto(this.index - 1);
                event.preventDefault();
            } else if(event.key === "ArrowRight") {
                this.goto(this.index + 1);
                event.preventDefault();
            }
        });  

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

    updateContent() {

        // get rid of contents that are too far from the current post
        for(const index in this.postContents) {
            if(Math.abs(index - this.index) > PRELOAD_RANGE) {
                this.postContents[index].remove();
                delete this.postContents[index];
            }
        }

        // preload
        for(let i = -PRELOAD_RANGE; i <= PRELOAD_RANGE; i++) {
            const idx = this.index + i;
            if(idx >= 0 && idx < this.posts.length && !this.postContents[idx]) {
                const content = this.createContent(this.posts[idx]);
                this.slideshow.append(content);
                this.postContents[idx] = content;
            }
        }

    }

    goto(nextIndex) {
        
        super.show();
        this.slideshow.focus();
        this.index = Math.min(this.posts.length - 1, Math.max(nextIndex, 0));
        this.updateContent();

        // update slideshow
        const content = this.postContents[this.index];
        content.scrollIntoView();

    }

}