// Average 3G

const conditions = {
    download: ((1.6 * 1000 * 1000) / 8) * 0.9,
    upload: ((750 * 1000) / 8) * 0.9,
    latency: 150 * 3.75,
};

const EmulateNetwork = {
    name: "Network conditions",
    when: "before",
    twice: false,
    run: async (_browser, page, _url) => {
        await page.emulateNetworkConditions(conditions);
    },
};
module.exports = EmulateNetwork;
