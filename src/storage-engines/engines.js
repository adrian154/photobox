const config = require("../../config.json").storageEngines;
const engines = {};

const ENGINES = {
    backblaze: require("./backblaze.js"),
    local: require("./local.js")
};

for(const name in config) {
    const properties = config[name];
    const engine = ENGINES[properties.type];
    if(engine) {
        console.log(`Creating storage engine ${name} (${properties.type})`);
        engines[name] = new engine(properties);
    } else {
        throw new Error(`Unknown storage engine type "${properties.type}"`);
    }
}

module.exports = engines;