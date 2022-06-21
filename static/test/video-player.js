class VideoPlayer {

    // video:
    // {
    //     poster: String,
    //     versions: {
    //         <name>: {
    //             url: String,
    //             type: String
    //         }
    //     }
    // }
    constructor(container, video) {
        
        this.container = container;
        this.video = video;
        this.container.classList.add("video-player");

        this.createVideoElement();
        this.createControls();

    }

    div(className) {
        const element = document.createElement("div");
        element.classList.add(className);
        return element;
    }

    button(icon) {
        const element = document.createElement("button");
        element.classList.add("material-symbols-outlined");
        element.textContent = icon;
        return element;
    }

    createVideoElement() {

        this.videoElement = document.createElement("video");
        this.container.append(this.videoElement);
        this.videoElement.loop = true;
        this.videoElement.poster = this.video.poster;

        // add video versions
        this.sources = {};
        for(const versionName in this.video.versions) {
            const version = this.video.versions[versionName];
            const source = document.createElement("source");
            source.src = version.url;
            if(version.type) {
                source.type = version.type;
            }
            this.videoElement.append(source);
            this.sources[versionName] = source;
        }

    }

    togglePlayback() {
        if(this.videoElement.paused) {
            this.videoElement.play();
            this.playButton.textContent = "pause";
        } else {
            this.videoElement.pause();
            this.playButton.textContent = "play_arrow";
        }
    }

    createControls() {

        this.controls = this.div("video-player-controls");
        this.container.append(this.controls);

        // add progress bar
        const progressOuter = this.div("video-player-progress-outer");
        this.controls.append(progressOuter);
        const progressInner = this.div("video-player-progress");
        progressOuter.append(progressInner);
        this.progressElapsed = this.div("video-player-progress-elapsed");
        const progressHandle = this.div("video-player-progress-handle");
        progressInner.append(this.progressElapsed, progressHandle);

        // add buttons
        const buttons = this.div("video-player-buttons");
        this.controls.append(buttons);

        this.playButton = this.button("play_arrow");
        const volumeButton = this.button("volume_up"),
              settingsButton = this.button("settings"),
              pictureInPictureButton = this.button("picture_in_picture_alt"),
              fullscreenButton = this.button("fullscreen");

        // float all buttons after the settings button to the right
        settingsButton.style.marginLeft = "auto";

        // create volume picker
        const volumePicker = this.div("video-player-volume");
        const volumeOuter = this.div("video-player-volume-outer");
        volumePicker.append(volumeOuter);
        const volumeInner = this.div("video-player-volume-inner");
        volumeOuter.append(volumeInner);
        volumeInner.append(this.div("video-player-volume-handle"));

        buttons.append(
            this.playButton,
            volumeButton,
            volumePicker,
            settingsButton,
            pictureInPictureButton,
            fullscreenButton
        );

        // progress bar logic
        let videoTime = 0, lastTime;
        const updateProgressBar = () => {
            const now = Date.now();
            if(!this.videoElement.paused && lastTime) {
                videoTime += (now - lastTime) / 1000 * this.videoElement.playbackRate;
            }
            lastTime = now;
            const proportion = videoTime / this.videoElement.duration;
            this.progressElapsed.style.transform = `translateX(${proportion * 100}%)`;
            progressHandle.style.transform = `translateX(${progressInner.getBoundingClientRect().width * proportion}px)`;
            //progressHandle
            requestAnimationFrame(updateProgressBar);
        };

        updateProgressBar();
        this.videoElement.addEventListener("timeupdate", () => videoTime = this.videoElement.currentTime);

        /*this.videoElement.addEventListener("timeupdate", event => {
            this.progressElapsed.style.width = `${this.videoElement.currentTime / this.videoElement.duration * 100}%`;
        });*/

        this.playButton.addEventListener("click", () => this.togglePlayback());
        this.videoElement.addEventListener("click", () => this.togglePlayback());
        pictureInPictureButton.addEventListener("click", () => this.videoElement.requestPictureInPicture());
        fullscreenButton.addEventListener("click", () => this.videoElement.requestFullscreen());
        
        // volume handler
        // TODO

    }

}