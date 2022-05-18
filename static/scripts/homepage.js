class CreateCollectionDialog extends HiddenLayer {

    constructor() {

        super("add-collection");
        document.getElementById("show-create-collection").addEventListener("click", () => this.show());
        
        // add engine options
        const enginesList = document.getElementById("storage-engine");
        fetch("/api/storage-engines").then(resp => resp.json()).then(engines => engines.forEach(engine => {
            const option = document.createElement("option");
            option.textContent = engine;
            enginesList.append(option);
        }));

        // logic
        const name = document.getElementById("new-collection-name");
        document.getElementById("create-button").addEventListener("click", () => {
            fetch("/api/collections/create", {
                method: "POST",
                headers: {"content-type": "application/json"},
                body: JSON.stringify({
                    name: name.value,
                    storageEngine: enginesList.value
                })
            }).then(resp => resp.json()).then(response => {
                if(response.error) {
                    alert(response.error);
                } else {
                    window.location.href = `/?collection=${encodeURIComponent(name.value)}`;
                }
            });
        });

    }

}

class Collections {

    constructor() {
        this.element = document.getElementById("collections");
    }

    render() {
        fetch("/api/homepage").then(resp => resp.json()).then(collections => this.consume(collections));
    }

    consume(collections) {
        for(const collection of collections) {
            
            // create outer element
            const element = document.createElement("div");
            element.classList.add("collection-preview");
            this.element.append(element);

            const a = document.createElement("a");
            a.href = `/?collection=${encodeURIComponent(collection.name)}`;

            const img = document.createElement("img");
            if(collection.preview) {
                img.src = collection.preview;
                img.style.backgroundImage = `url(${img.src})`;
            } else {
                img.src = "/images/default-post.png";
                img.style.objectFit = "cover";
            }
            a.append(img);
            element.append(a);

            const title = document.createElement("span");
            title.classList.add("collection-title");
            title.textContent = collection.name;
            element.append(title);
            
            const postCount = document.createElement("span");
            postCount.classList.add("post-count");
            postCount.textContent = `${collection.numPosts} posts`;
            element.append(postCount);
            
        }
    }

}