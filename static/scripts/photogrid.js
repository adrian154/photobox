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

        this.grid.prepend(container);

        // add image
        const img = document.createElement("img");
        img.classList.add("clickable");
        img.loading = "lazy";
        img.width = post.preview.width;
        img.height = post.preview.height;
        img.src = post.preview.url;
        container.append(img);

        // if its a video, add the duration
        if(post.duration) {
            const duration = document.createElement("span");
            duration.classList.add("duration");
            duration.textContent = `${Math.floor(post.duration / 60)}:${Math.round(post.duration % 60).toString().padStart(2, '0')}`;
            container.append(duration);
        }

        slideshow.addPost(post);
        img.addEventListener("click", () => slideshow.goto(post.index));

    }

    onPostsLoaded(posts) {
        for(let i = 0; i < posts.length; i++) {
            const post = posts[i];
            post.index = i;
            this.addPost(post);
        }
    }

}
