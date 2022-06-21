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

        this.addVideoElement();
        this.addControls();

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

    addVideoElement() {

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

    updatePlayButton() {
        if(this.videoElement.paused) {
            this.playButton.textContent = "play_arrow";
        } else {
            this.playButton.textContent = "pause";
        }
    }

    togglePlayback() {
        if(this.videoElement.paused) {
            this.videoElement.play();
        } else {
            this.videoElement.pause();
        }
        this.updatePlayButton();
    }

    addProgressBar() {

        const progressOuter = this.div("video-player-progress-outer");
        this.controls.append(progressOuter);
        const progressInner = this.div("video-player-progress");
        progressOuter.append(progressInner);
        this.progressElapsed = this.div("video-player-progress-elapsed");
        const progressHandle = this.div("video-player-progress-handle");
        progressInner.append(this.progressElapsed, progressHandle);

        // we have to interpolate the playback time between timeupdate events, which occur at a fairly low frequency
        let videoTime = 0, lastTime;
        const updateProgressBar = () => {
            const now = Date.now();
            if(!this.videoElement.paused && lastTime) {
                videoTime += (now - lastTime) / 1000 * this.videoElement.playbackRate;
            }
            lastTime = now;
            const proportion = videoTime / this.videoElement.duration;
            this.progressElapsed.style.transform = `translateX(${proportion * 100}%)`;
            progressHandle.style.transform = `translate(${progressInner.getBoundingClientRect().width * proportion}px, -70%)`;
            requestAnimationFrame(updateProgressBar);
        };

        // seek logic
        // TODO

        updateProgressBar();
        this.videoElement.addEventListener("timeupdate", () => videoTime = this.videoElement.currentTime);

    }

    createFullscreenButton() {
        const button = this.button("fullscreen");
        button.addEventListener("click", () => {
            if(document.fullscreenElement) {
                document.exitFullscreen();
                button.textContent = "fullscreen";
            } else {
                this.container.requestFullscreen();
                button.textContent = "fullscreen_exit";
            }
        });
        return button;
    }

    createVolumePicker() {

        // create volume picker
        const volumePicker = this.div("video-player-volume");
        const volumeOuter = this.div("video-player-volume-outer");
        volumePicker.append(volumeOuter);
        const volumeInner = this.div("video-player-volume-inner");
        volumeOuter.append(volumeInner);
        volumeInner.append(this.div("video-player-volume-handle"));

        return volumePicker;

    }

    formatTime(time) {
        return `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
    }

    createTimeText() {
        const timeText = document.createElement("span");
        timeText.classList.add("video-player-time");
        this.videoElement.addEventListener("timeupdate", () => {
            timeText.textContent = `${this.formatTime(this.videoElement.currentTime)} / ${this.formatTime(this.videoElement.duration)}`;
        });
        return timeText;
    }

    addControls() {

        this.controls = this.div("video-player-controls");
        this.container.append(this.controls);

        this.addProgressBar();

        // add buttons
        const buttons = this.div("video-player-buttons");
        this.controls.append(buttons);

        this.playButton = this.button("play_arrow");
        this.volumeButton = this.button("volume_up");
        const settingsButton = this.button("settings"),
              pictureInPictureButton = this.button("picture_in_picture_alt");

        this.videoElement.addEventListener("pause", () => this.updatePlayButton());
        this.videoElement.addEventListener("play", () => this.updatePlayButton());

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
            this.volumeButton,
            this.createVolumePicker(),
            this.createTimeText(),
            settingsButton,
            pictureInPictureButton,
            this.createFullscreenButton()
        );

        this.playButton.addEventListener("click", () => this.togglePlayback());
        this.videoElement.addEventListener("click", () => this.togglePlayback());
        pictureInPictureButton.addEventListener("click", () => this.videoElement.requestPictureInPicture());
        
        // volume handler
        // TODO

    }

}