const addons = require("./addons");

module.exports = {
    scraper: {
        urls: [],
        puppeteerOptions: {},
        addons,
        lighthouse: false,
        interval: 60_000,
        verbose: 0,
    },
    exporter: {
        port: 3000,
        verbose: 0,
    },
};
