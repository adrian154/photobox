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

    constructor(parent, tagList) {

        this.element = document.createElement("div");
        this.element.classList.add("tags");
        parent.append(this.element);

        // create an absolute positioning frame so that the menu stays with the add button
        const span = document.createElement("span");
        span.style.position = "relative";
        this.addButton = document.createElement("button")
        this.addButton.textContent = "+ Add";
        this.picker = this.createTagPicker(tagList);
        span.append(this.picker, this.addButton);
        this.element.append(span);

        // open the picker when the button is clicked
        this.addButton.addEventListener("click", () => {
            this.picker.style.display = "";
            this.picker.focus();
        });

    }

    addTag(tag) { /* ABSTRACT */ }
    removeTag(tag) { /* ABSTRACT */ }

    async insertTag(tag, menuButton) {

        await this.addTag(tag);

        // make the tag element
        const newTag = document.createElement("span");
        newTag.classList.add("tag", "clickable");
        newTag.textContent = tag + " \u00d7";
        this.element.append(" ", newTag);

        // hide the tag from the menu after it's been added
        menuButton.style.display = "none";

        // remove logic
        newTag.addEventListener("click", async () => {
            await this.removeTag(tag);
            newTag.remove();
            menuButton.style.display = "";
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

            const button = document.createElement("div");
            button.textContent = tag;
            button.classList.add("tag-option", "clickable");
            picker.append(button);

            // add logic
            button.addEventListener("click", () => {
                this.insertTag(tag, button);
                picker.blur();
            });

        }
        
        // hide picker when click elsewhere
        picker.addEventListener("focusout", () => {
            picker.style.display = "none"
        });
        
        return picker;

    }

}

/* tag picker backed by a set */
class SetTagPicker extends TagPicker {

    constructor(element, tagList) {
        super(element, tagList);
        this.tags = new Set();
    }

    addTag(tag) {
        this.tags.add(tag);
    }

    removeTag(tag) {
        this.tags.delete(tag);
    }

    value() {
        return Array.from(this.tags);
    }

}