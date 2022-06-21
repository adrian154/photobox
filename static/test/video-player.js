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
        this.videoElement.playsInline = true;
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

    createPlayButton() {
        this.playButton = this.button("play_arrow");
        this.playButton.addEventListener("click", () => this.togglePlayback());
        this.videoElement.addEventListener("click", () => this.togglePlayback());
        this.videoElement.addEventListener("pause", () => this.updatePlayButton());
        this.videoElement.addEventListener("play", () => this.updatePlayButton());
        return this.playButton;
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
        const update = (x, endScrub) => {
            const rect = progressInner.getBoundingClientRect();
            const seekTime = (x - rect.left) / rect.width * this.videoElement.duration;
            videoTime = seekTime;
            if(endScrub) {
                this.videoElement.currentTime = Math.min(Math.max(0, seekTime), this.videoElement.duration);
                this.videoElement.play();
            }
        };

        // touch handling
        progressOuter.addEventListener("touchstart", event => {
            update(event.touches[0].clientX);
            return false;
        });

        progressOuter.addEventListener("touchmove", event => {
            console.log("touchmove");
            update(event.touches[0].clientX);
            return false;
        });

        progressOuter.addEventListener("touchend", event => {
            update(event.touches[0].clientX, true);
            return false;
        });

        // mouse handling
        let mouseDown = false;
        progressOuter.addEventListener("mousedown", event => {
            update(event.clientX);
            mouseDown = true;
        });

        window.addEventListener("mousemove", event => {
            if(mouseDown) {
                this.videoElement.pause();
                update(event.clientX);
                event.preventDefault();
            }
        });

        window.addEventListener("mouseup", event => {
            if(mouseDown) {
                mouseDown = false;
                update(event.clientX, true);
            }
        });

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
                if(this.container.requestFullscreen)
                    this.container.requestFullscreen();
                else if(this.container.webkitRequestFullscreen)
                    this.container.webkitRequestFullscreen();
                button.textContent = "fullscreen_exit";
            }
        });
        return button;
    }

    createVolumeButton() {
        this.volumeButton = this.button("volume_up");
        return this.volumeButton;
    }

    createSettingsButton() {
        const button = this.button("settings");
        button.style.marginLeft = "auto";
        return button;
    }

    createPictureInPictureButton() {
        const button = this.button("picture_in_picture_alt");
        button.addEventListener("click", () => this.videoElement.requestPictureInPicture());
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

        // create volume picker
        const volumePicker = this.div("video-player-volume");
        const volumeOuter = this.div("video-player-volume-outer");
        volumePicker.append(volumeOuter);
        const volumeInner = this.div("video-player-volume-inner");
        volumeOuter.append(volumeInner);
        volumeInner.append(this.div("video-player-volume-handle"));

        buttons.append(
            this.createPlayButton(),
            this.createVolumeButton(),
            this.createVolumePicker(),
            this.createTimeText(),
            this.createSettingsButton(),
            this.createPictureInPictureButton(),
            this.createFullscreenButton()
        );

        // volume handler
        // TODO

    }

}