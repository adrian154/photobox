class Slideshow extends HiddenLayer {

    constructor() {
        super("slideshow");
        this.image = document.getElementById("preview");
        this.image.addEventListener("click", () => this.hide());
    }

    show(post) {
        super.show();
        this.image.src = post.displayURL;
    }

}