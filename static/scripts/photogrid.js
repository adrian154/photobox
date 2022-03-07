class PhotoGrid {

    // FIXME: resize not debounced; but is it really important? more at 10
    constructor() {
        this.grid = document.getElementById("photogrid");
        window.addEventListener("resize", () => this.fixAspectRatios());
    }

    addPost(post) {

        // add image to row
        const img = document.createElement("img");
        img.loading = "lazy";
        img.width = post.thumbnail.width * 0.6;
        img.height = post.thumbnail.height * 0.6;
        img.heightPerWidth = img.height / img.width;
        img.src = post.thumbnail.url;
        img.style.flexGrow = post.thumbnail.width; // ridiculous hack
        this.grid.append(img);

    }

    fixAspectRatios() {
        this.grid.querySelectorAll("img").forEach(image => {
            console.log(image.width, image.height);
            image.style.height = Math.round(image.width * image.heightPerWidth) + "px";
        });
    }

    onPostsLoaded(posts) {
        for(const post of posts) {
            this.addPost(post);
        }
    }

}
