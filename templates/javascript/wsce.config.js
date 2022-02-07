const addons = require("./addons");
/**
 * @type {import("./wsce").WsceConfig}
 */
module.exports = {
    scraper: {
        urls: [],
        puppeteerOptions: {},
        addons,
        interval: 60_000,
    },
    exporter: {
        port: 3000,
    },
};
