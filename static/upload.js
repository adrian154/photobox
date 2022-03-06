const filePicker = document.getElementById("files"),
      submit = document.getElementById("upload-button");

const tagList = createTagList();
document.getElementById("content").insertBefore(tagList.element, submit);

submit.addEventListener("click", async () => {

    if(filePicker.files.length == 0) {
        alert("You didn't select any files to upload.");
        return;
    }

    // we're forced to use XHR because fetch can't track upload progress
    for(let i = 0; i < filePicker.files.length; i++) {
    
        // build formdata
        const formData = new FormData();
        formData.append("tags", JSON.stringify(tagList.getValue()));
        formData.append("file", filePicker.files[i]);

        // send it off
        const request = new XMLHttpRequest();
        request.open("POST", "/api/collections/test");

        request.upload.addEventListener("progress", event => {
            console.log(event.loaded / event.total);
        });

        request.responseType = "json";
        console.log("Uploading " + filePicker.files[i].name)
        request.send(formData);

        await new Promise((resolve, reject) => {
            request.addEventListener("load", () => {
                console.log(`${i + 1}/${filePicker.files.length} uploaded`, request.response);
                resolve();
            });
        });

    }

});
