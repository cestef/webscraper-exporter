/**
 * @type {import("webscraper-exporter").WsceConfig}
 */
module.exports = {
    scraper: {
        urls: [],
        puppeteerOptions: {},
        addons: [],
        interval: 60_000,
    },
    exporter: {
        port: 3000,
    },
};
