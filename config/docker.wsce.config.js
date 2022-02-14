module.exports = {
    scraper: {
        urls: ["https://cstef.dev"],
        puppeteerOptions: { executablePath: "/usr/bin/chromium-browser", args: ["--no-sandbox"] },
        interval: 60_000,
        addons: [],
    },
    exporter: {
        port: 3000,
    },
};
