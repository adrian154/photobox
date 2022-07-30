const {Sessions} = require("./data-layer.js");
const config = require("../config.json");

// basic authentication
module.exports = (req, res, next) => {
    req.session = Sessions.get(req.cookies.session);
    if(config.UNSAFE_TESTING) {
        req.session = {token: "dummy", username: "test-user"}; 
    }
    next();
};