const {Sessions} = require("../data-layer");

module.exports = (req, res) => {
    if(req.session) {
        Sessions.remove(req.session.token);
        res.clearCookie("session");
    }
    res.status(200).redirect("/");
};