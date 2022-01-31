module.exports = {
    scraper: {
        urls: [],
        puppeteerOptions: { executablePath: "/usr/bin/chromium-browser", args: ["--no-sandbox"] },
        interval: 60_000,
        addons: [],
    },
    exporter: {
        port: 3000,
    },
};
