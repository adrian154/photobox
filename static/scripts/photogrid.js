class PhotoGrid {

    // FIXME: resize not debounced; but is it really important? more at 10
    constructor() {
        this.grid = document.getElementById("photogrid");
        this.last = document.createElement("div");
        this.grid.append(this.last);
        window.addEventListener("resize", () => this.fixAspectRatios());
    }

    addPost(post, bulk) {

        // add image to row
        const img = document.createElement("img");
        img.loading = "lazy";
        img.width = post.thumbnail.width * 0.6;
        img.height = post.thumbnail.height * 0.6;
        img.heightPerWidth = img.height / img.width;
        img.src = post.thumbnail.url;
        img.style.flexGrow = post.thumbnail.width;
        this.grid.insertBefore(img, this.last);

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
