
class UploadTracker extends HiddenLayer {

    constructor() {
        super("upload-progress");
        this.numTracked = 0;
        this.trackers = document.getElementById("progress");
        this.indicator = document.getElementById("upload-indicator");
        this.indicator.addEventListener("click", () => this.show());
    }

    add({formData, request, id}) {

        // update tracking state
        this.numTracked++;
        this.indicator.style.display = "";
        window.onbeforeunload = () => true;

        const tracker = document.createElement("div");
        this.trackers.append(tracker);
        
        const fileName = document.createElement("span");
        fileName.textContent = formData.get("file").name;
        tracker.append(fileName);

        const statusText = document.createElement("span");
        statusText.classList.add("upload-status");
        statusText.textContent = "Pending...";
        tracker.append(statusText);
        
        const progressOuter = document.createElement("div");
        progressOuter.classList.add("progress-bar");
        const progressBar = document.createElement("div");
        progressOuter.append(progressBar);
        tracker.append(progressOuter);

        request.upload.addEventListener("progress", event => {
            const percent = 100 * event.loaded / event.total;
            progressBar.style.width = percent + "%";
            if(event.loaded == event.total) {
                statusText.textContent = "Processing...";
            } else {
                statusText.textContent = `${Math.floor(percent)}%`;
            }
        });

        const fail = reason => {
            statusText.textContent = reason || "Failed";
            statusText.style.color = "#ff0000";
            const retryButton = document.createElement("span");
            retryButton.classList.add("retry-button", "clickable");
            retryButton.textContent = "\u21BA";
            fileName.append(" ", retryButton);
            retryButton.addEventListener("click", () => {
                tracker.remove();
                this.numTracked--;
                const request = app.uploader.openRequest();
                this.add(formData, request);   
                request.send(formData);
            });
        };

        request.addEventListener("error", () => fail("Network error"));
        request.addEventListener("load", () => {
            if(request.response?.error) {
                fail(request.response.error);
            } else {
                tracker.remove();
                this.numTracked--;
                if(this.numTracked == 0) {
                    this.hide();
                    this.indicator.style.display = "none";
                    window.onbeforeunload = null;
                    location.reload();
                }
                app.consumePosts([request.response]);
            }
        });

        return event => {
            progressOuter.classList.add("processing-progress");
            if(event.stage) {
                statusText.textContent = event.stage;
            } else if(event.progress) {
                progressBar.style.width = event.progress * 100 + "%";
            }
        };

    }

}

class Uploader extends HiddenLayer {

    constructor() {
        
        super("uploader");
        this.filePicker = document.getElementById("upload-files");
        this.layer.querySelector("form").addEventListener("submit", event => {
            this.upload();
            event.preventDefault();
        });

        this.processingEvents = new EventSource("/api/events");
        this.processingEvents.addEventListener("message", event => {

            const data = JSON.parse(event.data);
            if(data.sessionID) {
                this.eventsSessionID = data.sessionID;
            }

            if(data.id) {
                this.eventHandlers[data.id]?.(data);
            }

        });

        this.showButton = document.getElementById("show-upload");
        this.showButton.addEventListener("click", () => this.show());

        this.eventHandlers = {};

    }

    onInfoReceived(info) {
        this.tags = info.tags;
        this.signedIn = info.signedIn;
        this.resetTagPicker();
    }

    resetTagPicker() {
        this.tagPicker?.element.remove();
        this.tagPicker = new SetTagPicker(document.getElementById("upload-tags"), this.tags);
    }

    reset() {
        this.filePicker.value = "";
        this.resetTagPicker();
    }

    onCollectionLoaded(collection) {
        this.collectionName = collection.name;
        document.getElementById("upload-collection-name").textContent = this.collectionName;
        this.collectionType = collection.type;
        this.maybeShowButton();
    }

    // only show the upload button if the collection type is photobox AND the user is signed in
    // because these two conditions are determined asynchronously, this check may have to be run several times
    maybeShowButton() {
        if(this.collectionType === "photobox" && this.signedIn) {
            this.showButton.style.display = "";
        }
    }

    // open a new request
    openRequest() {
        const request = new XMLHttpRequest();
        request.open("POST", `/api/collections/${encodeURIComponent(this.collectionName)}`);
        request.responseType = "json";        
        return request;
    }

    async upload() {

        const tags = this.tagPicker.value();
        const files = [];
        for(let i = 0; i < this.filePicker.files.length; i++) files.push(this.filePicker.files[i]); // can't just copy the value of filePicker.files since it gets erased by .reset()
        this.reset();
        this.hide();
        app.uploadTracker.show();

        // open requests
        const uploads = [];
        for(const file of files) {
            const id = crypto.randomUUID();
            const formData = new FormData();
            formData.append("tags", JSON.stringify(tags));
            formData.append("originalName", file.name);
            formData.append("timestamp", Date.now());
            formData.append("uploadID", id);
            formData.append("file", file);
            if(this.eventsSessionID) {
                formData.append("eventsSessionID", this.eventsSessionID);
            }
            const upload = {formData, id, request: this.openRequest(formData)};
            uploads.push(upload);
            this.eventHandlers[id] = app.uploadTracker.add(upload);
        }

        // start uploading
        for(const {request, formData} of uploads) {
            request.send(formData);
            await new Promise((resolve, reject) => {
                request.addEventListener("error", resolve);
                request.upload.addEventListener("progress", event => {
                    if(event.loaded == event.total) {
                        resolve();
                    }
                });
            });
        }

    }

}