// allow clients to track processing in real life via server sent events
const EventsSessions = require("../events.js");

module.exports = (req, res) => {

    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // begin SSE by sending headers

    const id = EventsSessions.createSession(res);
    res.on("close", () => {
        EventsSessions.endSession(id);
        res.end();
    });

};