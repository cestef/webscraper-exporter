const { inspect } = require("util");

module.exports = {
    scraper: {
        urls: ["http://google.com"],
        puppeteerOptions: { headless: false },
        addons: [
            {
                name: "Logger",
                when: "after",
                twice: false,
                run: (_browser, _page, url, res) =>
                    console.log(`Test on ${url} finished :`, inspect(res)),
            },
        ],
        interval: 60_000,
    },
    exporter: {
        port: 9924,
    },
};
