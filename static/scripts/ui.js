// Base UI classes and other misc ui code

// animate `element` becoming `target`
const transformInto = (element, target) => new Promise(resolve => {
    const elemRect = element.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    element.style.transformOrigin = "top left";
    element.style.transition = "transform 0.2s";
    element.style.transform = `translate(${targetRect.left - elemRect.left}px, ${targetRect.top - elemRect.top}px) scale(${targetRect.width / elemRect.width})`;
    setTimeout(() => {
        element.style.transform = "";
        element.style.transition = "";
        resolve();
    }, 200);
});

// animate `element` turning from `target` back into natural size
const transformFrom = (element, target) => new Promise(resolve => {

    // transform the element to the initial state
    const elemRect = element.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    element.style.transformOrigin = "top left";
    element.style.transform = `translate(${targetRect.left - elemRect.left}px, ${targetRect.top - elemRect.top}px) scale(${targetRect.width / elemRect.width})`;

    // animate element going towards target state
    requestAnimationFrame(() => {
        element.style.transition = "transform 0.2s";
        element.style.transform = "";
        setTimeout(() => {
            element.style.transition = "";
            resolve();
        }, 200);
    });

});

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

class RedditBrowser extends HiddenLayer {

    constructor() {
        
        super("reddit-browser");
        document.getElementById("browse-reddit").addEventListener("click", () => this.show());
        
        // get elements
        this.name = document.getElementById("reddit-feed-name");
        this.subredditButton = document.getElementById("reddit-type-subreddit");
        this.sort = document.getElementById("reddit-sort");
        this.period = document.getElementById("time-period");
        this.sort.addEventListener("input", () => this.onSortChanged());
        
        // button logic
        this.layer.querySelector("form").addEventListener("submit", event => {
            event.preventDefault();
            this.go();
        });

        // restore values based on url
        this.restoreValues();

    }

    restoreValues() {
        const params = new URL(window.location).searchParams;
        if(params.has("reddit")) {
            if(params.has("r")) {
                this.name.value = params.get("r");
                this.subredditButton.checked = true;
            } else if(params.has("u")) {
                this.name.value = params.get("u");
                document.getElementById("reddit-type-user").checked = true;
            }
            this.sort.value = params.get("sort");
            this.period.value = params.get("period");            
        }
        this.onSortChanged();
    }

    onSortChanged() {
        if(this.sort.value === "top" || this.sort.value === "controversial") {
            this.period.style.display = "";
        } else {
            this.period.style.display = "none";
        }
    }

    go() {
        
        const params = new URL(window.location).searchParams;
        const destUrl = new URL("/", window.location.origin);
        let sameWindow = false;

        destUrl.searchParams.set("reddit", 1);
        if(this.subredditButton.checked) {
            destUrl.searchParams.set("r", this.name.value);
            if(params.get("r") === this.name.value) {
                sameWindow = true;
            }
        } else {
            destUrl.searchParams.set("u", this.name.value);
            if(params.get("u") === this.name.value) {
                sameWindow = true;
            }
        }

        destUrl.searchParams.set("sort", this.sort.value);
        destUrl.searchParams.set("period", this.period.value);

        if(sameWindow)
            window.open(destUrl, "_self")
        else
            window.open(destUrl, "_blank");
    
        this.hide();
    
    }

}

class Filter extends HiddenLayer {

    constructor() {

        super("filter");
        this.tagList = document.getElementById("filter-tag-list");
        this.tags = {};
        this.enabledTags = new Set();

        this.dropdownButton = document.getElementById("filter-link");
        this.dropdownButton.addEventListener("click", () => this.show());

    }

    filterPost(post) {
        post.photogridContainer.style.display = "";
        post.frame.style.display = "";
        if(this.enabledTags.size > 0) {
            for(const tag of post.tags) {
                if(this.enabledTags.has(tag)) {
                    return;
                }
            }
            post.photogridContainer.style.display = "none";
            post.frame.style.display = "none";
        }
    }

    applyFilter() {
        for(const post of app.slideshow.posts) {
            this.filterPost(post);
        }
    }

    onPostsLoaded(posts) {

        this.dropdownButton.style.display = "";

        for(const post of posts) {
            for(const tag of post.tags) {
                const entry = this.tags[tag];
                if(entry) {
                    entry.count++;
                    entry.counter.textContent = entry.count;
                } else {
                    const li = document.createElement("li");
                    const button = document.createElement("span");
                    button.classList.add("tag");
                    button.textContent = tag;
                    button.addEventListener("click", () => {
                        if(button.classList.toggle("selected")) {
                            this.enabledTags.add(tag);
                        } else {
                            this.enabledTags.delete(tag);
                        }
                        this.applyFilter();
                    });
                    const count = document.createElement("span");
                    count.classList.add("tag-count");
                    count.textContent = 1;
                    li.append(button, " ", count);
                    this.tags[tag] = {count: 1, element: li, counter: count};
                }
            }
        }

        // sort
        Object.values(this.tags).sort((a, b) => a.count - b.count).forEach(entry => this.tagList.prepend(entry.element));

    }

}