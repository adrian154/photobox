class CreateCollectionDialog extends HiddenLayer {

    constructor() {

        super("add-collection");
        document.getElementById("show-create-collection").addEventListener("click", () => this.show());
        this.enginesList = document.getElementById("storage-engine");

        // logic
        const name = document.getElementById("new-collection-name");
        this.layer.querySelector("form").addEventListener("submit", event => {
            fetch("/api/collections/create", {
                method: "POST",
                headers: {"content-type": "application/json"},
                body: JSON.stringify({
                    name: name.value,
                    storageEngine: this.enginesList.value,
                    visibility: document.getElementById("collection-visibility").value
                })
            }).then(resp => resp.json()).then(response => {
                if(response.error) {
                    alert(response.error);
                } else {
                    window.location.href = `/?collection=${encodeURIComponent(name.value)}`;
                }
            });
            event.preventDefault();
        });

    }

    onInfoReceived(info) {
        
        info.storageEngines?.forEach(engine => {
            const option = document.createElement("option");
            option.textContent = engine;
            this.enginesList.append(option);
        });
        
        if(info.signedIn) {
            document.getElementById("show-create-collection").style.display = "";
        }

    }

}

class Collections {

    constructor() {
        this.element = document.getElementById("collections");
        this.end = document.getElementById("collections-end");

        // remember whether hidden collections are shown
        if(localStorage.getItem("show-hidden")) {
            this.element.classList.add("show-hidden");
        }

        // toggle button logic
        this.end.addEventListener("click", () => {
            if(this.element.classList.toggle("show-hidden")) {
                localStorage.setItem("show-hidden", 1);
            } else {
                localStorage.removeItem("show-hidden");
            }
        });

    }

    render() {
        fetch("/api/homepage").then(resp => resp.json()).then(collections => this.consume(collections));
    }

    consume(collections) {

        this.element.style.display = "";
        collections = collections.sort((a, b) => a.name.localeCompare(b.name));
        
        for(const collection of collections) {

            // create outer element
            const element = document.createElement("div");
            element.classList.add("collection-preview");
            this.element.insertBefore(element, this.end);

            // add thumbnail
            const a = document.createElement("a");
            a.href = `/?collection=${encodeURIComponent(collection.name)}`;
            const img = document.createElement("img");
            img.src = collection.preview || "/images/default-post.png";
            a.append(img);
            element.append(a);

            // add title
            const title = document.createElement("span");
            title.classList.add("collection-title");
            title.textContent = collection.name;
            element.append(title);

            if(collection.visibility === "hidden") {
                element.classList.add("hidden");
                this.end.style.display = "";
            }
            
            // add post count
            if("numPosts" in collection) {
                const postCount = document.createElement("span");
                postCount.classList.add("post-count");
                postCount.textContent = `${collection.numPosts} ${collection.numPosts == 1 ? "post" : "posts"}`;
                element.append(document.createElement("br"), postCount);
            }
    
            
        }

    }

}