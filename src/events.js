const crypto = require("crypto");

class ProgressTracker {

    constructor(session, id) {
        this.session = session;
        this.id = id;
    }

    begin(stage) {
        this.session.write({id: this.id, stage});
    }

    report(progress) {
        this.session.write({id: this.id, progress});
    }

}

class EventsSession {

    constructor(id, res) {
        this.res = res;
        this.write({sessionID: id});
    }

    write(object) {
        if(!this.res.writableEnded) {
            this.res.write(`data: ${JSON.stringify(object)}\n\n`);
        }
    }

    createTracker(id) {
        return new ProgressTracker(this, id);
    }

};

const eventsSessions = {};

module.exports = {
    createSession: res => {
        const id = crypto.randomUUID();
        const session = new EventsSession(id, res);
        eventsSessions[id] = session;
        return id;
    },
    getSession: id => eventsSessions[id],
    endSession: id => {
        delete eventsSessions[id];
    }
};