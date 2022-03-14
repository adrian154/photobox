// parse URL
const collectionName = new URL(window.location).searchParams.get("collection");

const photoGrid = new PhotoGrid();
const uploader = new Uploader();
const uploadTracker = new UploadTracker();
const postEditor = new PostEditor();

if(collectionName) {
    fetch(`/api/collections/${collectionName}`).then(resp => resp.json()).then(collection => {
        document.title = `${collection.name} - photobox`;
        uploader.onCollectionLoaded(collection);
        photoGrid.onPostsLoaded(collection.posts);
    });
}