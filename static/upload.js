const files = document.getElementById("files"),
      submit = document.getElementById("upload-button");

const tagList = createTagList();
document.getElementById("content").insertBefore(tagList.element, submit);

submit.addEventListener("click", () => {

    // upload the files

});
