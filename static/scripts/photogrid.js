class PhotoGrid {

    constructor() {
        this.grid = document.getElementById("photogrid");
        this.placeholder = document.getElementById("photogrid-placeholder");
    }

    addPost(post) {
        
        const preview = post.versions.thumbnail;

        // create container, distribute width proportionally
        const container = document.createElement("div");
        container.classList.add("photogrid-item");
        const sizeContainer = (width, height) => {
            container.style.flexBasis = width / height * 20 + "em";
            container.style.flexGrow = width / height * 10; // make sure flex-grow > 1 so things grow, the absolute value isn't important
        };

        sizeContainer(preview.width, preview.height);
        this.grid.insertBefore(container, this.placeholder);

        // create image and set intrinsic size
        const img = document.createElement("img");
        img.classList.add("clickable");
        img.loading = "lazy";
        img.width = preview.width;
        img.height = preview.height;
        img.src = preview.url;
        img.style.opacity = "0%";
        container.append(img);

        // often, incorrect sizes are reported for the preview
        // when the image's actual dimensions become available, determine if we need to fix the sizing 
        img.addEventListener("load", () => {
            img.style.opacity = "100%";
            if(img.naturalWidth != preview.width || img.naturalHeight != preview.height) {
                sizeContainer(img.naturalWidth, img.naturalHeight);
            }
        });

        // if its a video, add the duration
        if(post.type === "video" || post.meta?.duration) {
            const duration = document.createElement("span");
            duration.classList.add("duration");
            if(post.meta?.duration) {
                duration.textContent = `${Math.floor(post.meta.duration / 60)}:${Math.round(post.meta.duration % 60).toString().padStart(2, '0')}`;
            } else {
                duration.textContent = "Video"; // we might not know the duration
            }
            container.append(duration);
        }
    
        // video hover preview
        const clips = post.versions.clips || post.versions.original;
        if(clips) {
            
            let playPreviewTimeout, video, progressBar;

            container.addEventListener("mouseenter", () => {
                if(!video) {
                    playPreviewTimeout = setTimeout(() => {
                        
                        // play video
                        video = document.createElement("video")
                        video.classList.add("video-preview");
                        video.muted = true;
                        video.src = clips.url;
                        video.loop = true;
                        container.append(video);
                        video.play();

                    }, 200);
                }
            });

            container.addEventListener("mouseleave", () => {
                clearTimeout(playPreviewTimeout);
                if(video) {
                    video.remove();
                    video = null;
                    progressBar = null;
                }
            });

        }

        // associate the post with the container so it's easy to delete later on
        // and because it's ✨responsive✨ the layout clears itself up automagically
        post.photogridContainer = container;

        // slideshow logic
        app.slideshow.addPost(post);
        img.addEventListener("click", async () => {
            const elem = post.frame?.querySelector(".video-player, .slideshow-centered");
            app.slideshow.show(post);
            if(elem) {
                await transformFrom(elem, img);
            }
        });

        // apply tag filters
        app.filter.filterPost(post);

    }

    onPostsLoaded(posts) {
        for(let i = 0; i < posts.length; i++) {
            const post = posts[i];
            post.index = i;
            this.addPost(post);
        }
    }

}
