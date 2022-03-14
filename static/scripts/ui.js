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

/* an abstract tag picker */
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
        this.addButton.addEventListener("click", () => this.addNewTag());
        this.picker = this.createTagPicker(tagList);
        div.append(this.picker);
        div.append(this.addButton);
        this.element.append(div);

    }

    reset() {
        
        // remove tags
        this.element.querySelectorAll(".tag").forEach(tag => tag.remove());
    
        // make all tag options visible again
        this.picker.querySelectorAll("div").forEach(option => option.style.display = "");
        
    }

    addTag(tag, tagOption) {

        // add a new tag to the list
        const newTag = document.createElement("span");
        newTag.classList.add("tag", "clickable");
        newTag.textContent = tag + " \u00d7";
        this.element.append(" ", newTag);
        tagOption.style.display = "none"; // hide tag from menu after it's been added
    
        // tag logic
        newTag.addEventListener("click", async () => {
            try {
                await this.onRemove(tag)
                newTag.remove();
                tagOption.style.display = ""; // re-add tag to menu after it's been removed
            } catch(error) {
                alert("Failed to remove tag: " + error.message);
            }                 
        });

    }

    createTagPicker(tagList) {

        // create picker
        const picker = document.createElement("div");
        picker.classList.add("tag-picker");
        picker.style.display = "none";
        picker.tabIndex = 0; // make picker focusable

        // add tags
        for(const tag of tagList) {

            const div = document.createElement("div");
            div.textContent = tag;
            div.classList.add("tag-option", "clickable");
            picker.append(div);

            // add logic
            div.addEventListener("click", async () => {
                try {
                    await this.onAdd(tag);
                    this.addTag(tag, div);
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

    addNewTag() {
        this.picker.style.display = "";
        this.picker.focus();
    }

}

/* tag picker backed by a set */
class SetTagPicker extends TagPicker {

    constructor(element, tagList) {
        super(element, tag => this.tags.add(tag), tag => this.tags.delete(tag), tagList);
        this.tags = new Set();
    }

    value() {
        return Array.from(this.tags);
    }

    reset() {
        super.reset();
        this.tags.clear();
    }

}