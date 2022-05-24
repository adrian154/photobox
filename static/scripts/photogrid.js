//const SCALE = window.innerHeight / 5 / 500;

class PhotoGrid {

    constructor() {
        this.grid = document.getElementById("photogrid");
        this.placeholder = document.getElementById("photogrid-placeholder");
    }

    addPost(post) {

        const preview = post.versions.preview;

        // create container, distribute width proportionally
        const container = document.createElement("div");
        container.classList.add("photogrid-item");
        container.style.flexBasis = preview.width / preview.height * 20 + "em";
        container.style.flexGrow = preview.width / preview.height * 10; // make sure flex-grow > 1 so things grow, the absolute value isn't important
        this.grid.insertBefore(container, this.placeholder);

        // create image and set intrinsic size
        const img = document.createElement("img");
        img.classList.add("clickable");
        img.loading = "lazy";
        img.width = preview.width;
        img.height = preview.height;
        img.src = preview.url;
        container.append(img);

        // if its a video, add the duration
        if(post.duration) {
            const duration = document.createElement("span");
            duration.classList.add("duration");
            duration.textContent = `${Math.floor(post.duration / 60)}:${Math.round(post.duration % 60).toString().padStart(2, '0')}`;
            container.append(duration);
        }

        // video hover preview
        if(post.versions.videoPreview) {
            
            let playPreviewTimeout, video;

            container.addEventListener("mouseenter", () => {
                if(!video) {
                    playPreviewTimeout = setTimeout(() => {
                        video = document.createElement("video")
                        video.classList.add("video-preview");
                        video.muted = true;
                        video.src = post.versions.videoPreview.url;
                        video.loop = true;
                        container.append(video);
                        video.play();
                    }, 300);
                }
            });

            container.addEventListener("mouseleave", () => {
                clearTimeout(playPreviewTimeout);
                if(video) {
                    video.remove();
                    video = null;
                }
            });

        }

        // associate the post with the container so it's easy to delete later on
        // and because it's ✨responsive✨ the layout clears itself up automagically
        post.photogridContainer = container;

        // slideshow logic
        app.slideshow.addPost(post);
        img.addEventListener("click", () => app.slideshow.show(post));

    }

    onPostsLoaded(posts) {
        for(let i = 0; i < posts.length; i++) {
            const post = posts[i];
            post.index = i;
            this.addPost(post);
        }
    }

}
