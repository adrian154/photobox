// register service worker
navigator.serviceWorker?.register("/service-worker.js");

class App {

    constructor() {

        // create some objects
        this.collections = new Collections();
        this.photoGrid = new PhotoGrid();
        this.uploader = new Uploader();
        this.uploadTracker = new UploadTracker();
        this.createCollectionDialog = new CreateCollectionDialog();
        this.editor = new PostEditor();
        this.slideshow = new Slideshow();
        this.redditBrowser = new RedditBrowser();

        // load tags; when we do this isn't really important, to be fair
        fetch("/api/tags").then(resp => resp.json()).then(tags => {
            this.uploader.onTagsLoaded(tags);
            this.editor.onTagsLoaded(tags);
        });

        // get a few important elements
        this.statusText = document.getElementById("status-text");

        // prepare for loading
        this.loading = false;
        this.url = null;
        this.receivedUrls = new Set();
        this.numPostsLoaded = 0;
        this.parseURL();

        if(this.url) {
        
            this.load();

            // set up infinite scroll
            const observer = new IntersectionObserver(() => {
                if(!this.loading && this.url.searchParams.has("after")) {
                    this.load();
                }
            });
            observer.observe(this.photoGrid.placeholder);

        } else {
            this.collections.render();
        }

    }

    parseURL() {
        
        const params = new URL(window.location).searchParams;
        if(params.has("collection")) {
            this.url = new URL(`/api/collections/${encodeURIComponent(params.get("collection"))}`, window.origin);
            this.url.searchParams.set("type", "reddit");
        } else if(params.get("reddit")) {

            this.url = new URL("/api/reddit", window.location.origin);

            // feed source
            if(params.has("r")) {
                this.url.searchParams.set("subreddit", params.get("r"));
            } else if(params.has("u")) {
                this.url.searchParams.set("user", params.get("u"));
            }

            // sort
            if(params.has("sort")) this.url.searchParams.set("sort", params.get("sort"));
            if(params.has("period")) this.url.searchParams.set("period", params.get("period"));

        }

    }

    load() {

        this.statusText.textContent = "Loading...";
        this.loading = true;

        fetch(this.url).then(resp => {
            if(!resp.ok) {
                if(resp.status === 404) {
                    throw new Error("No such collection :(");
                }
                throw new Error("Internal error occurred :(");
            }
            return resp.json();
        }).then(collection => {

            // if there is no `after` paramter, this is the initial collection load
            if(!this.url.searchParams.has("after")) {
                this.onCollectionLoaded(collection);
            }

            // flatten posts; collection.posts may contain arrays (galleries)
            const posts = collection.posts.filter(posts => {
                const post = Array.isArray(posts) ? posts[0] : posts;
                if(!post.url) {
                    return true;
                }
                if(this.receivedUrls.has(post.url)) {
                    return false; 
                }
                this.receivedUrls.add(post.url);
                return true;
            }).flat();

            this.consumePosts(posts);

            // update url
            if(collection.after) {
                this.url.searchParams.set("after", collection.after);
            } else {
                this.url.searchParams.delete("after"); // explicitly delete to indicate that the collection has ended
            }

            // update state
            this.loading = false;
            this.statusText.textContent = "";

            // KLUDGE: if there are more posts and no scrollbar has appeared, always load more posts so that infinite scroll can be engaged
            if(collection.after && document.body.scrollHeight < 2 * window.innerHeight) {
                this.load();
            }

        }).catch(err => {
            console.error(err);
            this.statusText.textContent = err.message
        });

    }

    onCollectionLoaded(collection) {
        const collectionName = document.getElementById("collection-name");
        document.title = `${collection.name} - photobox`;
        collectionName.style.display = "";
        collectionName.textContent = collection.name;
        if(collection.type === "photobox") {
            this.uploader.onCollectionLoaded(collection);
        }
    }

    consumePosts(posts) {
        this.numPostsLoaded += posts.length;
            document.getElementById("num-posts").textContent = this.numPostsLoaded + " posts";    
        this.photoGrid.onPostsLoaded(posts);
    }

}

const app = new App();
