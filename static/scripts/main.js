// parse URL
const collectionName = new URL(window.location).searchParams.get("collection");

const collections = new Collections();
const photoGrid = new PhotoGrid();
const uploader = new Uploader();
const uploadTracker = new UploadTracker();
const createCollectionDialog = new CreateCollectionDialog();
const editor = new PostEditor();
const slideshow = new Slideshow();

if(collectionName) {
    fetch(`/api/collections/${encodeURIComponent(collectionName)}`).then(resp => resp.json()).then(collection => {
        
        // KLUDGE
        

        if(collection.error) {
            alert("No such collection"); // FIXME
            return;
        }
        
        document.title = `${collection.name} - photobox`;
        document.getElementById("collection-name").textContent = collection.name;
        document.getElementById("num-posts").textContent = collection.posts.length + " posts";

        uploader.onCollectionLoaded(collection);
        photoGrid.onPostsLoaded(collection.posts);

    });
} else {
    collections.render();
}

fetch("/api/tags").then(resp => resp.json()).then(tags => {
    uploader.onTagsLoaded(tags);
    editor.onTagsLoaded(tags);
});