const express = require("express");
const config = require("./config.json");

const app = express();

// serve static files
app.use(express.static("static"));

// temporary testing route
app.get("/tags", (req, res) => res.json(["a", "b", "c"]));

app.listen(80, () => {
    console.log("Server now listening");
});