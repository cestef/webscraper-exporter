import { Browser, BrowserContext } from "puppeteer";
import { Addon, ScraperOptions } from "../index.js";
import { CPUStats, getCPU } from "./cpuUsage.js";
import { getCombinations } from "./functions.js";
import { lhReport } from "./lighthouse.js";
import { MemoryStats, getMemory } from "./memoryUage.js";
import Logger from "../../Logger.js";
import ms from "ms";

export interface ScrapeResult {
    cpuMetrics: CPUStats;
    memoryMetrics: MemoryStats;
    duration: number;
    bytesIn: number;
}
const scrapePage = async (
    context: BrowserContext,
    url: string,
    addons: Addon[],
    logger: Logger
): Promise<ScrapeResult> => {
    const page = await context.newPage();

    await page.setCacheEnabled(false);
    page.setDefaultNavigationTimeout(60000);
    const before = addons.filter((e) => e.when === "before" || !e.when);
    logger.debug(`Running addons that need to be ran before the test... (${before.length})`);

    for await (let addon of before) await addon.run(context, page, url, logger);

    const start = Date.now();
    const cpuMeter = await getCPU(page.client(), 100);

    let bytesIn = 0;
    const devTools = await page.target().createCDPSession();
    await devTools.send("Network.enable");
    devTools.on("Network.loadingFinished", (event) => (bytesIn += event.encodedDataLength));
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
    });
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width: bodyWidth, height: bodyHeight });

    const cpuMetrics = cpuMeter();
    const memoryMetrics = await getMemory(page);

    const end = Date.now();
    logger.debug(`Finished performance test for ${url}`);
    const after = addons.filter((e) => e.when === "after");
    logger.debug(`Running addons that need to be ran after the test... (${after.length})`);
    for await (let addon of after) await addon.run(context, page, url, logger);

    await page.close();

    return {
        cpuMetrics,
        memoryMetrics,
        duration: end - start,
        bytesIn,
    };
};
export const test = async (
    browser: Browser,
    config: ScraperOptions,
    URL: string,
    logger: Logger
): Promise<{ result: { scrape: ScrapeResult; addons: Addon[] }[]; lhr: any | null }> => {
    let res: {
        scrape: ScrapeResult;
        addons: Addon[];
    }[] = [];
    let addons: { addon: Addon; status: boolean }[] = [];

    for (let addon of config.addons) {
        if (addon.twice)
            addons = addons.concat(
                ...[
                    { addon, status: true },
                    { addon, status: false },
                ]
            );
        else addons.push({ addon, status: true });
    }

    const combinations = getCombinations(addons).filter((e) => {
        const mapped = e.map((e) => e.addon);
        return (
            new Set(mapped).size === mapped.length &&
            mapped.length > Object.keys(config.addons).length - 1
        );
    });
    if (combinations.length === 0) {
        const context = await browser.createIncognitoBrowserContext();
        res.push({ scrape: await scrapePage(context, URL, [], logger), addons: [] });
    }
    for await (let currentTests of combinations) {
        const context = await browser.createIncognitoBrowserContext();
        const addonsToUse = currentTests.filter((e) => e.status).map((e) => e.addon);
        res.push({
            scrape: await scrapePage(context, URL, addonsToUse, logger),
            addons: addonsToUse,
        });
    }
    let lhr;
    if (config.lighthouse) {
        logger.debug("Running LightHouse...");
        const lhStart = Date.now();
        lhr = await lhReport(browser, URL);
        const lhEnd = Date.now();
        logger.debug(`Ran LightHouse in ${ms(lhEnd - lhStart, { long: true })}`);
    }
    return { result: res, lhr };
};
