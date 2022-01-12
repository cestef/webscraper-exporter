import addons from "./addons/index.js";

export default {
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
