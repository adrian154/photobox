
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
        this.numPostsLoaded = 0;
        this.parseURL();

        if(this.url) {
        
            this.load();

            // set up infinite scroll
            const observer = new IntersectionObserver(() => {
                if(!this.loading && this.url.searchParams.has("after")) {
                    this.load();
                }
            }, {threshold: 0.5});
            observer.observe(this.photoGrid.placeholder);

        } else {
            this.collections.render();
        }

    }

    parseURL() {
        
        const params = new URL(window.location).searchParams;
        if(params.has("collection")) {
            this.url = new URL(`/api/collections/${encodeURIComponent(params.get("collection"))}`, window.origin);
        } else if(params.has("type")) {
            const type = params.get("type");
            if(type === "reddit") {

                this.url = new URL("/api/feeds/reddit", window.location.origin);

                // feed source
                if(params.has("subreddit")) {
                    this.url.searchParams.set("subreddit", params.get("subreddit"));
                } else if(params.has("feed")) {
                    this.url.searchParams.set("feed", params.get("feed"));
                } else if(params.has("user")) {
                    // TODO: user feeds (submitted)
                }

                // sort
                if(params.has("sort")) this.url.searchParams.set("sort", params.get("sort"));
                if(params.has("period")) this.url.searchParams.set("period", params.get("period"));

            }
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

                document.title = `${collection.name} - photobox`;
                document.getElementById("collection-name").textContent = collection.name;
    
                if(collection.managed) {
                    this.uploader.onCollectionLoaded(collection);
                }

            }

            // flatten posts; collection.posts may contain arrays (galleries)
            collection.posts = collection.posts.flat();

            // update # of posts as they arrive
            this.numPostsLoaded += collection.posts.length;
            document.getElementById("num-posts").textContent = this.numPostsLoaded + " posts";    

            // consume posts
            this.photoGrid.onPostsLoaded(collection.posts);

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

}

const app = new App();
