const SCALE = 0.5;

class PhotoGrid {

    // FIXME: resize not debounced; but is it really important? more at 10!!
    constructor() {
        this.grid = document.getElementById("photogrid");
        this.placeholder = document.getElementById("photogrid-placeholder");
        window.addEventListener("resize", () => this.fixAspectRatios());
    }

    addPost(post, bulk) {

        // add image to row
        const img = document.createElement("img");
        img.classList.add("clickable");
        img.loading = "lazy";
        img.width = post.preview.width * SCALE;
        img.height = post.preview.height * SCALE;
        img.heightPerWidth = img.height / img.width;
        img.src = post.preview.url;
        img.style.flexGrow = post.preview.width;
        this.grid.insertBefore(img, this.placeholder);

        const index = slideshow.addPost(post);
        img.addEventListener("click", () => slideshow.goto(index));

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
        for(let i = 0; i < posts.length; i++) {
            const post = posts[i];
            post.index = i;
            this.addPost(post, true);
        }
        this.fixAspectRatios();
    }

}
