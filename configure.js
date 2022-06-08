// CLI tool for configuring Photobox
// The following code is very yucky, look away!!
const {Collections, Users} = require("./src/data-layer.js");
const crypto = require("crypto");

const args = process.argv.slice(2);

const ADDUSER_USAGE = "adduser <username> <password>";
const DELUSER_USAGE = "deluser <username>";
const ADDREDDIT_USAGE = "addreddit <name> <url>";

if(args[0] === "adduser") {
    const username = args[1], password = args[2];
    if(!username || !password) {
        throw new Error("Usage: " + ADDUSER_USAGE);
    }
    const salt = crypto.randomFillSync(Buffer.alloc(16));
    Users.add({
        username,
        passwordHash: crypto.scryptSync(password, salt, 64).toString("base64"),
        salt: salt.toString("base64")
    });
    console.log("User was added");
} else if(args[0] === "deluser") {
    const username = args[1];
    if(!username) {
        throw new Error("Usage: " + DELUSER_USAGE);
    }
    if(Users.get(username)) {
        Users.remove(username);
        console.log("User was deleted");
    } else {
        throw new Error("No such user");
    }
} else if(args[0] === "addreddit") {
    const name = args[1], url = args[2];
    if(!name || !url) {
        throw new Error("Usage: " + ADDREDDIT_USAGE);
    }
    Collections.addReddit(name, url);
    console.log("collection added");
} else {
    throw new Error("Usage: " + ADDUSER_USAGE + "\n" + DELUSER_USAGE);
}