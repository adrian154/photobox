// Base UI classes

class HiddenLayer {

    constructor(elementID) {
        
        this.layer = document.getElementById(elementID);
        if(!this.layer) {
            throw new Error("No such layer");
        }

        window.addEventListener("keydown", event => {
            if(event.key === "Escape") {
                this.hide();
            }
        })

        this.layer.addEventListener("click", event => {
            if(event.target === this.layer) {
                this.hide();
            }
        });

        this.dialog = this.layer.querySelector(".dialog, .closeable");
        if(this.dialog) {
            const closeButton = document.createElement("button");
            closeButton.classList.add("close-button");
            closeButton.textContent = "\u00D7";
            this.dialog.append(closeButton);
            closeButton.addEventListener("click", () => this.hide());
        }

    }

    show() {
        this.layer.style.display = "";
    }

    hide() {
        this.layer.style.display = "none";
    }

}

// base tag picker
// it's meant to be disposable, create new ones instead of resetting them
class TagPicker {

    constructor(parent, tagList, selectedTags) {

        this.element = document.createElement("div");
        this.element.classList.add("tags");
        parent.append(this.element);

        // add tags
        if(selectedTags) {
            for(const tag of selectedTags) {
                this.addTag(tag, true);
            }
        }

        for(const tag of tagList) {
            if(!selectedTags?.includes(tag)) {
                this.addTag(tag);
            }
        }

    }

    addTag(tag, selected) {

        const tagElement = document.createElement("span");
        tagElement.classList.add("tag");
        tagElement.textContent = tag;
        this.element.append(tagElement, " ");

        if(selected) {
            tagElement.classList.add("selected");
        }

        tagElement.addEventListener("click", async () => {
            if(tagElement.classList.contains("selected")) {
                try {
                    await this.onTagRemoved(tag)
                    tagElement.classList.remove("selected");
                } catch(err) {
                    alert("Failed to remove tag: " + err.message);
                }
            } else {
                try {
                    await this.onTagAdded(tag);
                    tagElement.classList.add("selected");
                } catch(err) {
                    alert("Failed to add tag: " + err.message);
                }
            }
        });

    }

    onTagAdded(tag)   { throw new Error("Not implemented"); }
    onTagRemoved(tag) { throw new Error("Not implemented"); }

}

/* tag picker backed by a set */
class SetTagPicker extends TagPicker {

    constructor(element, tagList) {
        super(element, tagList);
        this.tags = new Set();
    }

    onTagAdded(tag) {
        this.tags.add(tag);
    }

    onTagRemoved(tag) {
        this.tags.delete(tag);
    }

    value() {
        return Array.from(this.tags);
    }

}