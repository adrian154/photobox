class PhotoGrid {

    constructor() {
        this.grid = document.getElementById("photogrid");
        this.curRow = this.newRow();
    }

    newRow() {
        const row = document.createElement("div");
        row.classList.add("row");
        this.grid.append(row);
        return row;
    }

    addPost(post) {

        // add image to row
        const img = document.createElement("img");
        img.loading = "lazy";
        img.width = post.thumbnail.width;
        img.height = post.thumbnail.height;
        img.src = post.thumbnail.url;
        this.curRow.append(img);

        // detect if the row is full if the element's width is lower than its full width
        // if it's full, adjust height for members of the row to preserve aspect ratio
        if(img.width < post.thumbnail.width) {
            const height = Math.round(post.thumbnail.height * img.width / post.thumbnail.width) + "px";
            this.curRow.querySelectorAll("img").forEach(img => {
                img.style.height = height;
            });
            this.curRow = this.newRow();
        }

    }

    onPostsLoaded(posts) {
        for(const post of posts) {
            this.addPost(post);
        }
    }

}
