class CreateCollectionDialog extends HiddenLayer {

    constructor() {

        super("add-collection");
        document.getElementById("show-create-collection").addEventListener("click", () => this.show());
        
        // add engine options
        const enginesList = document.getElementById("storage-engine");
        fetch("/api/storage-engines").then(resp => resp.json()).then(engines => engines.forEach(engine => {
            const option = document.createElement("option");
            option.textContent = engine;
            enginesList.append(option);
        }));

        // logic
        const name = document.getElementById("new-collection-name");
        document.getElementById("create-button").addEventListener("click", () => {
            fetch("/api/collections/create", {
                method: "POST",
                headers: {"content-type": "application/json"},
                body: JSON.stringify({
                    name: name.value,
                    storageEngine: enginesList.value
                })
            }).then(resp => resp.json()).then(response => {
                if(response.error) {
                    alert(response.error);
                } else {
                    window.location.href = `/?collection=${encodeURIComponent(name.value)}`;
                }
            });
        });

    }

}