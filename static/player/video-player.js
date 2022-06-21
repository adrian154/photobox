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

    addHoverbox() {
        
        this.hoverbox = this.div("video-player-hover");
        this.hoverbox.style.opacity = 0;
        this.progressOuter.append(this.hoverbox);
        this.preview = this.div("video-player-preview");

        if(this.video.sprites) {
            this.preview.style.width = this.video.sprites.spriteWidth + "px";
            this.preview.style.height = this.video.sprites.spriteHeight + "px";
            this.preview.style.background = `url(${this.video.sprites.url})`;
            this.hoverbox.append(this.preview);
        }

        this.hoverTime = document.createElement("span");
        this.hoverbox.append(this.hoverTime);

        // show the hoverbox when hovering over progress bar
        this.progressOuter.addEventListener("mouseenter", () => {
            this.hoverbox.style.opacity = 1;
            this.hovering = true;
        });

        this.progressOuter.addEventListener("mouseleave", () => {
            if(!this.scrubbing) {
                this.hoverbox.style.opacity = 0;
            }
            this.hovering = false;
        });

    }

    updateScrubPreview(x) {

        const fullWidth = this.progressInner.getBoundingClientRect().width,
              hoverboxWidth = this.hoverbox.getBoundingClientRect().width,
              time = x / fullWidth * this.videoElement.duration,
              centeredX = x - hoverboxWidth / 2;

        // update hoverbox
        this.hoverbox.style.transform = `translateX(${Math.min(fullWidth - hoverboxWidth, Math.max(centeredX, 0))}px)`;
        this.hoverTime.textContent = this.formatTime(time);
        
        // update background
        const i = Math.floor(time / this.video.sprites.interval),
              spriteX = i % this.video.sprites.width, 
              spriteY = Math.floor(i / this.video.sprites.width);
        this.preview.style.backgroundPosition = `-${spriteX * this.video.sprites.spriteWidth}px -${spriteY * this.video.sprites.spriteHeight}px`;

    };

    addProgressBar() {

        const progressOuter = this.div("video-player-progress-outer");
        this.progressOuter = progressOuter;
        this.controls.append(progressOuter);
        this.addHoverbox();

        // inner progress bar
        const progressInner = this.div("video-player-progress");
        this.progressInner = progressInner; 
        progressOuter.append(progressInner);
        const progressElapsed = this.div("video-player-progress-elapsed");
        const progressHandle = this.div("video-player-progress-handle");
        progressInner.append(progressElapsed, progressHandle);

        let videoTime = 0, lastTime;
        const updateProgressBar = () => {

            // we have to interpolate the playback time between timeupdate events, which occur at a fairly low frequency
            const now = Date.now();
            if(!this.videoElement.paused && lastTime) {
                videoTime += (now - lastTime) / 1000 * this.videoElement.playbackRate;
            
            }
            lastTime = now;

            const proportion = videoTime / this.videoElement.duration,
                  x = progressInner.getBoundingClientRect().width * proportion;
            progressElapsed.style.transform = `translateX(${proportion * 100}%)`;
            progressHandle.style.transform = `translate(${x - 5}px, -70%)`;
            
            requestAnimationFrame(updateProgressBar);

        };

        // seek logic
        const update = x => {
            const rect = progressInner.getBoundingClientRect();
            const seekTime = (x - rect.left) / rect.width * this.videoElement.duration;
            videoTime = seekTime;
            if(!this.scrubbing) {
                this.videoElement.currentTime = Math.min(Math.max(0, seekTime), this.videoElement.duration);
                this.videoElement.play();
                if(!this.hovering) {
                    this.hoverbox.style.opacity = 0;
                }
            }
        };

        // touch handling
        progressOuter.addEventListener("touchstart", event => {
            update(event.touches[0].clientX);
            this.scrubbing = true;
            return false;
        });

        let lastKnownX;
        progressOuter.addEventListener("touchmove", event => {
            lastKnownX = event.touches[0].clientX;
            update(lastKnownX);
            this.updateScrubPreview(lastKnownX);
            this.videoElement.pause();
            return false;
        });

        progressOuter.addEventListener("touchend", () => {
            this.scrubbing = false;
            update(lastKnownX);
            return false;
        });

        // mouse handling
        progressOuter.addEventListener("mousedown", event => {
            this.scrubbing = true;
            update(event.clientX);
        });

        window.addEventListener("mousemove", event => {
            if(this.scrubbing) {
                this.videoElement.pause();
                update(event.clientX);
                this.updateScrubPreview(event.clientX - progressOuter.getBoundingClientRect().left);
                event.preventDefault();
            }
        });

        progressOuter.addEventListener("mousemove", event => {
            if(event.target == progressOuter) {
                this.updateScrubPreview(event.offsetX);
            }
        });

        window.addEventListener("mouseup", event => {
            if(this.scrubbing) {
                this.scrubbing = false;
                update(event.clientX);
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
                if(this.container.requestFullscreen) {
                    this.container.requestFullscreen();
                    button.textContent = "fullscreen_exit";
                } else if(this.videoElement.webkitEnterFullscreen) {
                    this.videoElement.webkitEnterFullscreen();
                }
            }
        });
        return button;
    }

    createVolumeButton() {
        this.volumeButton = this.button("volume_up");
        this.volumeButton.addEventListener("click", () => {
            if(this.videoElement.muted) {
                this.videoElement.muted = false;
                this.volumeButton.textContent = "volume_up";
            } else {
                this.videoElement.muted = true;
                this.volumeButton.textContent = "volume_off";
            }
        });
        return this.volumeButton;
    }

    createSettingsButton() {
        const button = document.createElement("button");
        button.classList.add("video-player-settings-button");
        const text = document.createElement("span");
        text.classList.add("material-symbols-outlined");
        text.textContent = "settings";
        button.append(text);
        const menu = this.div("video-player-settings");
        for(const name in this.sources) {
            const option = document.createElement("div");
            option.textContent = name;
            option.addEventListener("click", () => {
                const currentSource = this.videoElement.querySelector("source");
                if(this.sources[name] == currentSource) return;
                const time = this.videoElement.currentTime;
                this.videoElement.prepend(this.sources[name]);
                this.videoElement.load();
                this.videoElement.currentTime = time;
                this.videoElement.play();
            });
            menu.append(option);
        }
        button.append(menu);
        button.addEventListener("click", () => button.classList.toggle("video-player-settings-shown"));
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
            //this.createVolumePicker(),
            this.createTimeText(),
            this.createSettingsButton(),
            this.createPictureInPictureButton(),
            this.createFullscreenButton()
        );

    }

}