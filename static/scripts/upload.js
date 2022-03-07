class HiddenLayer {

    constructor(elementID) {
        this.layer = document.getElementById(elementID);
        console.log(this.layer);
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
                if(await this.onAdd(tag)) {

                    // add a new tag to the list
                    const newTag = document.createElement("span");
                    newTag.classList.add("tag", "removable-tag");
                    newTag.textContent = tag + " \u00d7";
                    this.element.prepend(newTag, " ");
                    div.style.display = "none"; // hide tag from menu after it's been added
                
                    // tag logic
                    newTag.addEventListener("click", async () => {
                        if(await this.onRemove(tag)) {
                            newTag.remove();
                            div.style.display = ""; // re-add tag to menu after it's been removed
                        }                        
                    });
                
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

class Uploader extends HiddenLayer {

    constructor() {
        super("uploader");
        this.tags = new Set();
        this.filePicker = document.getElementById("upload-files");
        document.getElementById("upload-button").addEventListener("click", () => this.upload());
        fetch("/api/tags").then(resp => resp.json()).then(tags => this.ingestTags(tags));
    }

    onCollectionLoaded(collection) {
        document.getElementById("upload-collection-name").textContent = collection.name;
    }

    async upload() {

        if(this.filePicker.files.length == 0) {
            alert("You didn't select any files to upload.");
            return;
        }

        for(let i = 0; i < this.filePicker.files.length; i++) {

            // build formdata
            const formData = new FormData();
            formData.append("tags", JSON.stringify(Array.from(this.tags)));
            formData.append("file", this.filePicker.files[i]);

            // send it off
            const request = new XMLHttpRequest();
            request.open("POST", `/api/collections/${collection}`);

            request.upload.addEventListener("progress", event => {
                console.log(event.loaded / event.total);
            });

            request.responseType = "json";
            request.send(formData);

            try {
                await new Promise((resolve, reject) => {
                    request.addEventListener("error", reject);
                    request.addEventListener("load", () => {
                        console.log(request.response);
                        resolve();
                    });
                });
            } catch(error) {
                // ... error
                continue;
            }

            if(request.response.error) {
                // ... error
            } else {
                photoGrid.addPost(request.response);
            }

        }

    }

    ingestTags(tags) {
        const picker = new TagPicker(document.getElementById("upload-tags"), tag => this.tags.add(tag), tag => this.tags.delete(tag), tags);
    }

}