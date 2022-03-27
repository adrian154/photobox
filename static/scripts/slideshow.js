// preload some content
const PRELOAD_RANGE = 2;

class Slideshow extends HiddenLayer {

    constructor() {
        
        super("slideshow");
        this.slideshow = document.getElementById("slideshow-content");
        this.originalLink = document.getElementById("original-link");
        this.tagsOuter = document.getElementById("editor-tags");
        this.posts = [];
        this.postContents = {};
        
        this.slideshow.tabIndex = 0;
        this.slideshow.addEventListener("click", event => {
            if(event.target === this.slideshow) {
                this.hide();
            }
        });

        this.slideshow.querySelector(".close-button").addEventListener("click", () => this.hide());
        this.slideshow.addEventListener("keydown", event => {
            if(event.key === "ArrowLeft") {
                this.goto(this.index - 1);
            } else if(event.key === "ArrowRight") {
                this.goto(this.index + 1);
            }
        });  
        
        this.slideshow.addEventListener("wheel", event => {
            if(event.deltaY > 0) {
                this.goto(this.index + 1);
            } else {
                this.goto(this.index - 1);
            }
            event.preventDefault();
        });

    }

    addPost(post) {
        this.posts.push(post);
        return this.posts.length - 1;
    }

    createContent(post) {
        if(post.type === "image") {
            const img = document.createElement("img");
            img.classList.add("slideshow-centered");
            img.src = post.displaySrc;
            return img;
        } else if(post.type === "video") {
            const video = document.createElement("video");
            video.classList.add("slideshow-centered");
            video.controls = true;
            video.loop = true;
            video.src = post.displaySrc;
            return video;
        } else {
            alert("Unsupported post type");
        }
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
                content.style.display = "none";
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

        // hide prev post
        if(this.shownContent) {
            this.shownContent.style.display = "none";
        }

        // update slideshow
        const content = this.postContents[this.index];
        content.style.display = "";
        this.shownContent = content;

        // update editor
        const post = this.posts[this.index];
        this.originalLink.href = post.originalURL;

        // TODO: implement editor
        /*
        this.picker?.element.remove();
        this.picker = new TagPicker();
        */


    }

}