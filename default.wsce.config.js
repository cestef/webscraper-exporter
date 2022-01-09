module.exports = {
    scraper: {
        urls: [],
        puppeteerOptions: {},
        conditions: [],
        lighthouse: false,
        interval: 60_000,
        verbose: false,
    },
    exporter: {
        port: 3000,
        verbose: false,
    },
};
