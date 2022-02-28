// create tags datalist
let availableTags;
fetch("/tags").then(resp => resp.json()).then(tags => {
    
    const datalist = document.createElement("datalist");
    datalist.id = "available-tags";
    availableTags = tags;

    for(const tag of tags) {
        const option = document.createElement("option");
        option.value = tag;
        datalist.append(option);
    }

    document.body.append(datalist);

});

const createTagList = () => {

    const element = document.createElement("form");

    const input = document.createElement("input");
    input.classList.add("tag-input");
    input.setAttribute("list", "available-tags");
    element.append(input);

    const tags = document.createElement("div");
    tags.classList.add("tags");
    element.append(tags);

    const tagSet = new Set();
    element.addEventListener("submit", () => {
        if(availableTags.includes(input.value)) {
            
            const tagName = input.value;
            input.value = "";
            
            const tag = document.createElement("span");
            tag.classList.add("tag");
            tag.classList.add("removable-tag");
            tag.textContent = `${tagName} \u00d7`;
            tags.append(tag, " ");

            tagSet.add(tagName);
            tag.addEventListener("click", () => {
                tagSet.delete(tagName);
                tag.remove();
            });

        }
    });

    return {element, getValue: () => {}};

};