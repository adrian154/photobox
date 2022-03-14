
class UploadTracker extends HiddenLayer {

    constructor() {
        super("upload-progress");
        this.numTracked = 0;
        this.trackers = document.getElementById("progress");
    }

    add(formData, request) {
        
        this.numTracked++;

        const tracker = document.createElement("div");
        const fileName = document.createElement("span");
        fileName.textContent = formData.get("file").name;
        tracker.append(fileName);
        const statusText = document.createElement("span");
        statusText.classList.add("upload-status");
        tracker.append(statusText);
        const progress = document.createElement("progress");
        progress.max = 100;
        tracker.append(progress);
        this.trackers.append(tracker);

        request.upload.addEventListener("progress", event => {
            const percent = Math.floor(100 * event.loaded / event.total);
            progress.value = percent;
            if(event.loaded == event.total) {
                statusText.textContent = "Processing...";
            } else {
                statusText.textContent = `${percent}%`;
            }
        });

        const fail = () => {
            statusText.textContent = "Failed";
            statusText.style.color = "#ff0000";
            const retryButton = document.createElement("span");
            retryButton.classList.add("retry-button", "clickable");
            retryButton.textContent = "\u21BA";
            fileName.append(" ", retryButton);
            retryButton.addEventListener("click", () => {
                tracker.remove();
                uploader.uploadItem(formData);
            });
        };

        request.addEventListener("error", fail);
        request.addEventListener("load", () => {
            if(request.response.error) {
                fail();
            } else {
                tracker.remove();
                this.numTracked--;
                if(this.numTracked == 0) this.hide();
                photoGrid.addPost(request.response);
            }
        });

    }

}

class Uploader extends HiddenLayer {

    constructor() {
        super("uploader");
        this.filePicker = document.getElementById("upload-files");
        document.getElementById("upload-button").addEventListener("click", () => this.upload());
        fetch("/api/tags").then(resp => resp.json()).then(tags => {
            this.tags = tags;
            this.resetTagPicker();
        });
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
        document.getElementById("upload-collection-name").textContent = collection.name;
        const button = document.getElementById("show-upload");
        button.style.display = "";
        button.addEventListener("click", () => this.show());
    }

    // this function should NEVER throw, even if the upload failed
    // failure is indicated to the user via the upload progress dialog
    // resolves as soon as the file is finished *uploading* (not necessarily processing)
    async uploadItem(formData) {
        
        // send upload
        const request = new XMLHttpRequest();
        request.open("POST", `/api/collections/${collectionName}`);
        request.responseType = "json";        
        uploadTracker.add(formData, request);
        request.send(formData);

        return new Promise((resolve, reject) => {
            request.addEventListener("error", resolve);
            request.upload.addEventListener("progress", event => {
                if(event.loaded == event.total) {
                    resolve();
                }
            });
        });

    }

    async upload() {

        if(this.filePicker.files.length == 0) {
            alert("You didn't select any files to upload.");
            return;
        }

        const tags = this.tagPicker.value();
        const files = [];
        for(let i = 0; i < this.filePicker.files.length; i++) files.push(this.filePicker.files[i]); // can't just copy the value of filePicker.files since it gets erased by .reset()
        this.reset();
        this.hide();
        uploadTracker.show();

        for(const file of files) {
            const formData = new FormData();
            formData.append("tags", JSON.stringify(tags));
            formData.append("file", file);
            await this.uploadItem(formData);
        }

    }

}