import { EventEmitter } from "events";
import ms from "ms";
import puppeteer, {
    Browser,
    BrowserConnectOptions,
    BrowserContext,
    BrowserLaunchArgumentOptions,
    LaunchOptions,
} from "puppeteer";
import Logger from "../Logger";
import { TestResult, Addon } from "./types";
import { CPUStats, getCPU } from "./utils/cpuUsage";
import { getCombinations } from "./utils/functions";
import { lhReport } from "./utils/lighthouse";
import { getMemory, MemoryStats } from "./utils/memoryUage";

const defaultOptions: Partial<ScraperOptions> = {
    verbose: 3,
    lighthouse: false,
    interval: 60_000,
};
declare interface Scraper {
    on(event: "testsFinish", listener: (tests: TestResult) => void): this;
    on(event: "testsStart", listener: () => void): this;
    on(event: "testFinish", listener: (res: TestResult[keyof TestResult]) => void): this;
    on(event: "testStart", listener: (URL: string) => void): this;

    on(event: "addonFinish", listener: (addon: Addon, result: any) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
}
class Scraper extends EventEmitter {
    browser: Browser | null;
    options: ScraperOptions;
    interval: NodeJS.Timeout | null;
    results: TestResult[];
    logger: Logger;
    constructor(options: ScraperOptions) {
        super();
        this.browser = null;
        this.options = { ...defaultOptions, ...options };
        this.interval = null;
        this.results = [];
        this.logger = new Logger(true, this.options.verbose as number);
    }
    async start() {
        await this.scrape();
        this.interval = setInterval(this.scrape.bind(this), this.options.interval);
    }
    async scrape() {
        if (!this.browser) this.browser = await puppeteer.launch(this.options.puppeteerOptions);
        const tests: TestResult = {};
        this.emit("testsStart");
        const testsStart = Date.now();
        for await (let URL of this.options.urls) {
            this.logger.debug(`Starting testing for ${URL}`);
            this.emit("testStart", URL);
            try {
                const { result, lhr } = await this.test(URL);
                tests[URL] = { scrape: result, lhr };
            } catch (e) {
                this.logger.error(`Test run failed for ${URL}, check debug for error`);
                this.logger.debug(e);
            }
            this.emit("testFinish", tests[URL]);
        }
        const testsEnd = Date.now();
        this.logger.info(
            `Finished testing for each URL after ${ms(testsEnd - testsStart)}, next tests in ${ms(
                this.options.interval as number,
                {
                    long: true,
                }
            )} (${new Date(Date.now() + (this.options.interval as number)).toLocaleTimeString()})`
        );
        if (testsEnd - testsStart > (this.options.interval as number) && this.results.length === 0)
            this.logger.warn(
                `The testing took longer than ${ms(this.options.interval as number, {
                    long: true,
                })}, consider augmenting the interval.`
            );
        this.emit("testsFinish", tests);
    }
    async testPage(context: BrowserContext, url: string, addons: Addon[]) {
        const page = await context.newPage();
        await page.setCacheEnabled(false);
        page.setDefaultNavigationTimeout(60000);
        const before = addons.filter((e) => e.when === "before" || !e.when);
        this.logger.debug(
            `Running addons that need to be ran before the test... (${before.length})`
        );

        for await (let addon of before)
            try {
                const res = await addon.run(context, page, url, this.logger);
                this.emit("addonFinish", addon, res);
            } catch (e) {
                this.logger.warn(`Failed to run the "${addon.name}" addon`);
                this.logger.debug(e);
            }

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
        this.logger.debug(`Finished performance test for ${url}`);
        const after = addons.filter((e) => e.when === "after");
        this.logger.debug(`Running addons that need to be ran after the test... (${after.length})`);
        for await (let addon of after)
            try {
                const res = await addon.run(context, page, url, this.logger);
                this.emit("addonFinish", addon, res);
            } catch (e) {
                this.logger.warn(`Failed to run the "${addon.name}" addon`);
                this.logger.debug(e);
            }

        await page.close();

        return {
            cpuMetrics,
            memoryMetrics,
            duration: end - start,
            bytesIn,
        };
    }
    async test(URL: string) {
        if (!this.browser) {
            throw new Error("Tried to start a test without init'ing the scraper");
        }
        let res: {
            test: ScrapeResult;
            addons: Addon[];
        }[] = [];
        let addons: { addon: Addon; status: boolean }[] = [];

        for (let addon of this.options.addons) {
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
                mapped.length > Object.keys(this.options.addons).length - 1
            );
        });
        if (combinations.length === 0) {
            const context = await this.browser?.createIncognitoBrowserContext();
            res.push({ test: await this.testPage(context, URL, []), addons: [] });
        }
        for await (let currentTests of combinations) {
            const context = await this.browser?.createIncognitoBrowserContext();
            const addonsToUse = currentTests.filter((e) => e.status).map((e) => e.addon);
            res.push({
                test: await this.testPage(context, URL, addonsToUse),
                addons: addonsToUse,
            });
        }
        let lhr;
        if (this.options.lighthouse) {
            this.logger.debug("Running LightHouse...");
            const lhStart = Date.now();
            lhr = await lhReport(this.browser, URL);
            const lhEnd = Date.now();
            this.logger.debug(`Ran LightHouse in ${ms(lhEnd - lhStart, { long: true })}`);
        }
        return { result: res, lhr };
    }
    async stop() {
        this.logger.debug("Stopping scraper...");
        await this.browser?.close();
        this.interval && clearInterval(this.interval);
    }
}

interface ScraperOptions {
    urls: string[];
    puppeteerOptions?: LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions;
    addons: Addon[];
    /**
     * Whether to generate a lighthouse report or not
     * @default false
     */
    lighthouse?: boolean;
    /**
     * The interval in ms to run the scraper.
     * @default 60000
     */
    interval?: number;
    /**
     * Whether to print detailled information or not
     * @default 3
     */
    verbose?: number;
}
interface ScrapeResult {
    cpuMetrics: CPUStats;
    memoryMetrics: MemoryStats;
    duration: number;
    bytesIn: number;
}
export { Scraper, ScraperOptions, ScrapeResult };
