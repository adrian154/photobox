// parse URL
const collectionName = new URL(window.location).searchParams.get("collection");

const collections = new Collections();
const photoGrid = new PhotoGrid();
const uploader = new Uploader();
const uploadTracker = new UploadTracker();
const createCollectionDialog = new CreateCollectionDialog();
const editor = new PostEditor();
const slideshow = new Slideshow();

const loadPosts = (collectionName, after) => {
    
    const url = new URL(`/api/collections/${encodeURIComponent(collectionName)}`, window.location.origin);
    if(after) url.searchParams.set("after", after);

    let numPosts = 0;
    fetch(url.href).then(resp => resp.json()).then(collection => {

        if(collection.error) {
            alert("No such collection"); 
            return;
        }

        document.title = `${collection.name} - photobox`;
        document.getElementById("collection-name").textContent = collection.name;

        numPosts += collection.posts.length;
        document.getElementById("num-posts").textContent = numPosts + " posts";

        if(!after) {
            uploader.onCollectionLoaded(collection);
        }

        photoGrid.onPostsLoaded(collection.posts);
        if(collection.after) {
            loadPosts(collectionName, collection.after);
        }

    });

};

if(collectionName) {
    loadPosts(collectionName);
} else {
    collections.render();
}

fetch("/api/tags").then(resp => resp.json()).then(tags => {
    uploader.onTagsLoaded(tags);
    editor.onTagsLoaded(tags);
});