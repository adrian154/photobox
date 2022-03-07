class HiddenLayer {

    constructor(elementID) {
        this.layer = document.getElementById(elementID);
        if(!this.layer) {
            throw new Error("No such layer");
        }
    }

    show() {
        this.layer.style.display = "";
    }

    hide() {
        this.layer.style.display = "none";
    }

}

class TagPicker {

    constructor(element, onAdd, onRemove, tagList) {

        // save handlers
        this.onAdd = onAdd;
        this.onRemove = onRemove;

        // create elements
        this.element = element;
        this.element.classList.add("tags");

        // create a dispoable div that functions as a new absolute positioning frame
        const div = document.createElement("div");
        div.style.position = "relative";
        div.style.display = "inline";
        this.addButton = document.createElement("button")
        this.addButton.textContent = "+ Add";
        this.addButton.addEventListener("click", () => this.addTag());
        this.picker = this.createTagPicker(tagList);
        div.append(this.picker);
        div.append(this.addButton);
        this.element.append(div);

    }

    reset() {
        this.element.querySelectorAll(".tag").forEach(tag => tag.remove());
    }

    createTagPicker(tagList) {

        // create picker
        const picker = document.createElement("div");
        picker.classList.add("tag-picker");
        picker.style.display = "none";
        picker.tabIndex = 0;

        // add tags
        for(const tag of tagList) {

            const div = document.createElement("div");
            div.textContent = tag;
            div.classList.add("tag-option");
            picker.append(div);

            // add logic
            div.addEventListener("click", async () => {
                try {
                    if(await this.onAdd(tag)) {

                        // add a new tag to the list
                        const newTag = document.createElement("span");
                        newTag.classList.add("tag", "removable-tag");
                        newTag.textContent = tag + " \u00d7";
                        this.element.prepend(newTag, " ");
                        div.style.display = "none"; // hide tag from menu after it's been added
                    
                        // tag logic
                        newTag.addEventListener("click", async () => {
                            try {
                                if(await this.onRemove(tag)) {
                                    newTag.remove();
                                    div.style.display = ""; // re-add tag to menu after it's been removed
                                }    
                            } catch(error) {
                                alert("Failed to remove tag: " + error.message);
                            }                 
                        });
                    
                    }
                } catch(error) {
                    alert("Failed to add tag: " + error.message);
                }
                picker.style.display = "none";
            });

        }
        
        // hide picker when click elsewhere
        picker.addEventListener("focusout", () => {
            picker.style.display = "none"
        });
        
        return picker;

    }

    addTag() {
        this.picker.style.display = "";
        this.picker.focus();
    }

}

class UploadTracker extends HiddenLayer {

    constructor() {
        super("upload-progress");
        this.trackers = document.getElementById("progress");
    }

    add(formData, request) {
        
        const tracker = document.createElement("div");
        
        const p = document.createElement("p");
        p.textContent = formData.get("file").name;
        tracker.append(p);

        const progress = document.createElement("progress");
        progress.max = 100;
        tracker.append(progress);
        
        this.trackers.append(tracker);

        request.upload.addEventListener("progress", event => {
            const percent = Math.floor(100 * event.loaded / event.total);
            progress.value = percent;
            p.textContent = `${percent}%`;
        });

        request.addEventListener("error", error => {

        });

        request.addEventListener("load", () => {
            if(request.response.error) {

            } else {
                photoGrid.addPost(request.response);
            }
        });

    }

}

class Uploader extends HiddenLayer {

    constructor() {
        super("uploader");
        this.tags = new Set();
        this.filePicker = document.getElementById("upload-files");
        document.getElementById("upload-button").addEventListener("click", () => this.upload());
        fetch("/api/tags").then(resp => resp.json()).then(tags => this.ingestTags(tags));
    }

    reset() {
        this.filePicker.value = "";
        this.tagPicker?.reset();
    }

    onCollectionLoaded(collection) {
        document.getElementById("upload-collection-name").textContent = collection.name;
    }

    // this function should NEVER throw, even if the upload failed
    // failure is indicated to the user via the upload progress dialog
    async uploadItem(formData) {
        
        // send upload
        const request = new XMLHttpRequest();
        request.open("POST", `/api/collections/${collection}`);
        request.responseType = "json";        
        uploadTracker.add(formData, request);
        request.send(formData);
        
        return new Promise((resolve, reject) => {
            request.addEventListener("error", resolve);
            request.addEventListener("load", resolve);
        });

    }

    async upload() {

        if(this.filePicker.files.length == 0) {
            alert("You didn't select any files to upload.");
            return;
        }

        const tags = Array.from(this.tags);
        const files = this.filePicker.files;
        //this.reset();
        this.hide();
        uploadTracker.show();

        console.log(files);
        for(let i = 0; i < files.length; i++) {

            // build formdata
            const formData = new FormData();
            formData.append("tags", JSON.stringify(tags));
            formData.append("file", files[i]);
            await this.uploadItem(formData);

        }

    }

    ingestTags(tags) {
        this.tagPicker = new TagPicker(document.getElementById("upload-tags"), tag => this.tags.add(tag), tag => this.tags.delete(tag), tags);
    }

}