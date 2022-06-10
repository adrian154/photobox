const {Sessions} = require("./data-layer.js");

// basic authentication
module.exports = (req, res, next) => {
    req.session = Sessions.get(req.cookies.session);
    next();
};