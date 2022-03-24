class Slideshow extends HiddenLayer {

    constructor() {
        super("slideshow");
        this.image = document.getElementById("preview");
        this.originalLink = document.getElementById("original-link");
        this.tagsOuter = document.getElementById("editor-tags");
    }

    // operations:
    // delete
    // original
    // tags

    show(post) {
        
        super.show();
        this.image.src = post.display;
        this.originalLink.href = post.originalURL;
        
        // replace tag picker
        this.picker?.element.remove();
        this.picker = new TagPicker();


    }

}