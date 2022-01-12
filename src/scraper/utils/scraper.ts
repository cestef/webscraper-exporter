import { Browser, BrowserContext } from "puppeteer";
import { Condition, ScraperOptions } from "../index.js";
import { CPUStats, getCPU } from "./cpuUsage.js";
import { getCombinations } from "./functions.js";
import { lhReport } from "./lighthouse.js";
import { MemoryStats, getMemory } from "./memoryUage.js";

export interface ScrapeResult {
    cpuMetrics: CPUStats;
    memoryMetrics: MemoryStats;
    duration: number;
    bytesIn: number;
    conditionsDuration: number;
}
const scrapePage = async (
    context: BrowserContext,
    url: string,
    conditions: Condition[]
): Promise<ScrapeResult> => {
    const page = await context.newPage();

    await page.setCacheEnabled(false);
    page.setDefaultNavigationTimeout(60000);

    const conditionsStart = Date.now();
    for await (let condition of conditions) {
        await condition.run(context, page, url);
    }
    const conditionsEnd = Date.now();

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
    await page.close();

    return {
        cpuMetrics,
        memoryMetrics,
        duration: end - start,
        bytesIn,
        conditionsDuration: conditionsEnd - conditionsStart,
    };
};
export const test = async (
    browser: Browser,
    config: ScraperOptions,
    URL: string
): Promise<{ result: { scrape: ScrapeResult; conditions: Condition[] }[]; lhr: any | null }> => {
    let res: {
        scrape: ScrapeResult;
        conditions: Condition[];
    }[] = [];
    let conditions: { condition: Condition; status: boolean }[] = [];

    for (let condition of config.conditions) {
        if (condition.twice)
            conditions = conditions.concat(
                ...[
                    { condition, status: true },
                    { condition, status: false },
                ]
            );
        else conditions.push({ condition, status: true });
    }

    const combinations = getCombinations(conditions).filter((e) => {
        const mapped = e.map((e) => e.condition);
        return (
            new Set(mapped).size === mapped.length &&
            mapped.length > Object.keys(config.conditions).length - 1
        );
    });
    if (combinations.length === 0) {
        const context = await browser.createIncognitoBrowserContext();
        res.push({ scrape: await scrapePage(context, URL, []), conditions: [] });
    }
    for await (let currentTests of combinations) {
        const context = await browser.createIncognitoBrowserContext();
        const conditionsToUse = currentTests.filter((e) => e.status).map((e) => e.condition);
        res.push({
            scrape: await scrapePage(context, URL, conditionsToUse),
            conditions: conditionsToUse,
        });
    }
    let lhr;
    if (config.lighthouse) {
        lhr = await lhReport(browser, URL);
    }
    return { result: res, lhr };
};
