//const SCALE = window.innerHeight / 5 / 500;

class PhotoGrid {

    constructor() {
        this.grid = document.getElementById("photogrid");
        this.placeholder = document.getElementById("photogrid-placeholder");
    }

    addPost(post) {

        // create container, distribute width proportionally
        const container = document.createElement("div");
        container.classList.add("photogrid-item");
        container.style.flexBasis = post.preview.width / post.preview.height * 20 + "vh";
        container.style.flexGrow = post.preview.width / post.preview.height * 10; // make sure flex-grow > 1 so things grow... the absolute value isn't important
        this.grid.insertBefore(container, this.placeholder);

        // create image and set intrinsic size
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

        // associate the post with the container so it's easy to delete later on
        // and because it's ✨responsive✨ the layout clears itself up automagically
        post.photogridContainer = container;

        // slideshow logic
        slideshow.addPost(post);
        img.addEventListener("click", () => slideshow.show(post));

    }

    onPostsLoaded(posts) {
        for(let i = 0; i < posts.length; i++) {
            const post = posts[i];
            post.index = i;
            this.addPost(post);
        }
    }

}
