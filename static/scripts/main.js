// parse URL
const collection = new URL(window.location).searchParams.get("collection");

const photoGrid = new PhotoGrid();
const uploader = new Uploader();
const slideshow = new Slideshow();

fetch(`/api/collections/${collection}`).then(resp => resp.json()).then(collection => {
    uploader.onCollectionLoaded(collection);
    photoGrid.onPostsLoaded(collection.posts);
});
