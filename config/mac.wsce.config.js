const conditions = {
    download: ((1.6 * 1000 * 1000) / 8) * 0.9,
    upload: ((750 * 1000) / 8) * 0.9,
    latency: 150 * 3.75,
};

module.exports = {
    scraper: {
        urls: ["https://google.com"],
        interval: 60_000,
        addons: [
            // {
            //     name: "Network conditions",
            //     when: "before",
            //     twice: false,
            //     run: async (_, page, __) => {
            //         await page.emulateNetworkConditions(conditions);
            //     },
            // },
            // {
            //     name: "CPU Throttling",
            //     when: "before",
            //     twice: false,
            //     run: async (_, page, __) => {
            //         await page.emulateCPUThrottling(1);
            //     },
            // },
        ],
        puppeteerOptions: { headless: true },
    },
    exporter: {
        port: 3001,
    },
};
