const addons = require("./addons");

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
