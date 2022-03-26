class Slideshow extends HiddenLayer {

    constructor() {
        
        super("slideshow");
        this.slideshow = document.getElementById("slideshow-content");
        this.originalLink = document.getElementById("original-link");
        this.tagsOuter = document.getElementById("editor-tags");
        
        
        this.slideshow.addEventListener("click", event => {
            if(event.target === this.slideshow) {
                this.hide();
            }
        });
        this.slideshow.querySelector(".close-button").addEventListener("click", () => this.hide());

    }


    createContent(post) {
        console.log(post);
        if(post.type === "image") {
            const img = document.createElement("img");
            img.classList.add("slideshow-replaced");
            img.src = post.display;
            return img;
        } else if(post.type === "video") {
            const video = document.createElement("video");
            video.classList.add("slideshow-replaced");
            video.controls = true;
            video.loop = true;
            video.src = post.display;
            return video;
        } else {
            alert("Unsupported post type");
        }
    }

    show(post) {
        
        super.show();
        this.originalLink.href = post.originalURL;
        
        // TODO: fix 
        if(this.slideshowContent) this.slideshowContent.remove();
        this.slideshowContent = this.createContent(post);
        this.slideshow.append(this.slideshowContent);

        // TODO: implement editor
        /*
        this.picker?.element.remove();
        this.picker = new TagPicker();
        */


    }

}