const {Users, Sessions} = require("../data-layer.js");
const crypto = require("crypto");

module.exports = (req, res) => {

    const username = String(req.body.username), password = String(req.body.password);
    const user = Users.get(username);
    if(!user) {
        return res.sendStatus(401);
    }

    crypto.scrypt(password, Buffer.from(user.salt, "base64"), 64, (err, hash) => {
        
        if(err) {
            return res.sendStatus(500);
        }

        if(crypto.timingSafeEqual(hash, Buffer.from(user.passwordHash, "base64"))) {
            const sessionid = crypto.randomUUID();
            Sessions.add({token: sessionid, username});
            res.cookie("session", sessionid, {
                httpOnly: true,
                secure: true,
                expires: new Date(Date.now() + 1036800000)
            }).sendStatus(200);
        } else {
            res.sendStatus(401);
        }

    });

};