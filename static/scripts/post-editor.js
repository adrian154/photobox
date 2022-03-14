class PostEditor extends HiddenLayer {

    constructor() {
        super("post-editor");
        this.image = document.getElementById("preview");
        this.originalLink = document.getElementById("original-link");
    }

    // operations:
    // delete
    // original
    // tags

    show(post) {
        super.show();
        this.image.src = post.displayURL;
        this.originalLink.href = post.originalURL;
    }

}