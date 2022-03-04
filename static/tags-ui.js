const createTagList = (tagList, onAddTag, onRemoveTag) => {

    const element = document.createElement("form");

    const input = document.createElement("input");
    input.classList.add("tag-input");
    input.setAttribute("list", "available-tags");
    element.append(input);

    const tags = document.createElement("div");
    tags.classList.add("tags");
    element.append(tags);

    const tagSet = new Set();
    element.addEventListener("submit", event => {

        if(availableTags.includes(input.value) && !tagSet.has(input.value)) {
            
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

        event.preventDefault();

    });

    return {element, getValue: () => Array.from(tagSet)};

};