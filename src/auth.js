const {Users, Sessions} = require("./data-layer.js");
const crypto = require("crypto");

// basic authentication
module.exports = (req, res, next) => {

    // get the session
    const session = Sessions.get(req.cookies.session);

    // if there's already a session, proceed
    if(session) {
        req.session = session;
        next();
    } else {

        // otherwise, check if the user is authorizing
        const header = req.header("Authorization");
        if(header) {

            const parts = header.split(" ");
            if(parts[0] != "Basic") return res.sendStatus(401);

            const [username, password] = Buffer.from(parts[1], "base64").toString("utf-8").split(":");
            const user = Users.get(username);
            if(!user) return res.sendStatus(401);

            crypto.scrypt(password, Buffer.from(user.salt, "base64"), 64, (err, hash) => {
                if(err) return res.sendStatus(500);
                if(crypto.timingSafeEqual(hash, Buffer.from(user.passwordHash, "base64"))) {
                    const sessionid = crypto.randomUUID();
                    Sessions.add({token: sessionid, username});
                    res.cookie("session", sessionid, {
                        httpOnly: true,
                        secure: true,
                        expires: new Date(Date.now() + 1036800000)
                    });
                    next();
                } else {
                    res.sendStatus(401);
                }
            });

        } else {
            res.status(401).header("WWW-Authenticate", 'Basic realm="Photobox"').send();
        }

    }

};