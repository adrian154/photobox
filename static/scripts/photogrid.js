const SCALE = 0.5;

class PhotoGrid {

    constructor() {
        this.grid = document.getElementById("photogrid");
        this.placeholder = document.getElementById("photogrid-placeholder");
    }

    addPost(post) {

        // create container
        const container = document.createElement("div");
        container.classList.add("photogrid-item");
        container.style.flexBasis = post.preview.width * SCALE + "px";
        container.style.flexGrow = post.preview.width;
        this.grid.insertBefore(container, this.placeholder);

        // add image
        const img = document.createElement("img");
        img.classList.add("clickable");
        img.loading = "lazy";
        img.src = post.preview.url;
        container.append(img);

        // if its a video, add some 

        const index = slideshow.addPost(post);
        img.addEventListener("click", () => slideshow.goto(index));

    }

    onPostsLoaded(posts) {
        for(let i = 0; i < posts.length; i++) {
            const post = posts[i];
            post.index = i;
            this.addPost(post, true);
        }
    }

}
