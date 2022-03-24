class PhotoGrid {

    // FIXME: resize not debounced; but is it really important? more at 10!!
    constructor() {
        this.grid = document.getElementById("photogrid");
        window.addEventListener("resize", () => this.fixAspectRatios());
    }

    addPost(post, bulk) {

        // add image to row
        const img = document.createElement("img");
        img.classList.add("clickable");
        img.loading = "lazy";
        img.width = post.preview.width * 0.6;
        img.height = post.preview.height * 0.6;
        img.heightPerWidth = img.height / img.width;
        img.src = post.preview.url;
        img.style.flexGrow = post.preview.width;
        this.grid.prepend(img);

        img.addEventListener("click", () => slideshow.show(post));

        if(!bulk) {
            this.fixAspectRatios();
        }

    }

    fixAspectRatios() {
        this.grid.querySelectorAll("img").forEach(image => {
            image.style.height = Math.round(image.width * image.heightPerWidth) + "px";
        });
    }

    onPostsLoaded(posts) {
        for(const post of posts) {
            this.addPost(post, true);
        }
        this.fixAspectRatios();
    }

}
