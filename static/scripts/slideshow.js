class Slideshow extends HiddenLayer {

    constructor() {
        super("slideshow");
        this.slideshow = document.getElementById("slideshow-content");
        this.originalLink = document.getElementById("original-link");
        this.tagsOuter = document.getElementById("editor-tags");
    }

    // operations:
    // delete
    // original
    // tags

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
            video.src = post.display;
            return video;
        } else {
            alert("oopsie daisy. unsupported post type");
        }
    }

    show(post) {
        
        super.show();
        this.originalLink.href = post.originalURL;
        
        // kludge
        this.slideshow.innerHTML = "";
        const content = this.createContent(post);
        this.slideshow.append(content);

        // replace tag picker
        this.picker?.element.remove();
        this.picker = new TagPicker();


    }

}