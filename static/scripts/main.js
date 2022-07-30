// register service worker
navigator.serviceWorker?.register("/service-worker.js");

// simple unbiased shuffling algorithm; it's not as fast as a Fisher-Yates shuffle but whatever
const shuffle = arr => arr.map(value => ({value, x: Math.random()})).sort((a, b) => a.x - b.x).map(({value}) => value);

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
        this.filter = new Filter();

        // load tags; when we do this isn't really important, to be fair
        fetch("/api/info").then(resp => resp.json()).then(info => {
            this.uploader.onInfoReceived(info);
            this.editor.onInfoReceived(info);
            this.createCollectionDialog.onInfoReceived(info);
            if(info.signedIn) {
                document.getElementById("signin-link").style.display = "none";
            } else {
                document.getElementById("signout-link").style.display = "none";
            }
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

            // set up shuffle link
            const shuffleUrl = new URL(window.location);
            shuffleUrl.searchParams.set("shuffle", 1);
            const shuffleLink = document.getElementById("shuffle-link");
            shuffleLink.href = shuffleUrl;
            shuffleLink.style.display = "";

        } else {
            this.collections.render();
        }

        // add scroll logic
        let lastScrollTop = 0;
        const nav = document.querySelector("nav");
        window.addEventListener("scroll", event => {

            // hide the navbar on scroll 
            if(window.scrollY > lastScrollTop) {
                nav.style.top = "-60px";
            } else {
                nav.style.top = 0;
            }
            lastScrollTop = window.scrollY;

            // load more posts when close to bottom
            if(this.url.searchParams.has("after") && window.scrollY + window.innerHeight + 1000 > document.body.scrollHeight) {
                this.load();
            }

        }, {passive: true});

        // add toggle darkmode logic
        document.getElementById("darkmode-link").addEventListener("click", () => {
            if(document.documentElement.classList.toggle("dark")) {
                localStorage.setItem("dark-theme", 1);
            } else {
                localStorage.removeItem("dark-theme");
            }
        });

    }

    parseURL() {
        
        const params = new URL(window.location).searchParams;
        if(params.has("collection")) {
            this.url = new URL(`/api/collections/${encodeURIComponent(params.get("collection"))}`, window.origin);
        } else if(params.has("reddit")) {

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

        this.shuffle = params.has("shuffle");
        if(this.shuffle) {
            this.posts = [];
        }

    }

    load() {

        if(this.loading) {
            return;
        }

        if(!this.shuffle) {
            this.statusText.textContent = "Loading...";
            this.loading = true;
        }

        fetch(this.url).then(resp => {
            if(!resp.ok) {
                if(resp.status === 404) {
                    throw new Error("No such collection :(");
                } else {
                    throw new Error("Internal error occurred :(");
                }
            }
            return resp.json();
        }).then(collection => {

            // if there is no `after` paramter, this is the initial collection load
            if(!this.url.searchParams.has("after")) {
                this.onCollectionLoaded(collection);
            }

            // flatten posts; collection.posts may contain arrays (galleries)
            const posts = collection.posts.filter(posts => {
                if(posts.length == 0) return false; // KLUDGE
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

            // update url
            if(collection.after) {
                this.url.searchParams.set("after", collection.after);
            } else {
                this.url.searchParams.delete("after"); // explicitly delete to indicate that the collection has ended
            }

            // if shuffling, all posts need to be loaded
            if(this.shuffle) {
                
                // save posts; if there are more, load them asynchronously
                this.posts.push(...posts);
                if(collection.after) {
                    this.statusText.textContent = `Loading... (${this.posts.length})`;
                    setTimeout(() => this.load());
                    return;
                } else {
                    this.consumePosts(shuffle(this.posts));
                }

            } else {

                // otherwise, consume and display posts on-the-fly
                this.consumePosts(posts);

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
        
        this.uploader.onCollectionLoaded(collection);
        this.editor.onCollectionLoaded(collection);

    }

    consumePosts(posts) {
        this.numPostsLoaded += posts.length;
        document.getElementById("num-posts").textContent = this.numPostsLoaded + " posts";    
        this.photoGrid.onPostsLoaded(posts);
        this.filter.onPostsLoaded(posts);
    }

}

const app = new App();