import { EventEmitter } from "events";
import ms from "ms";
import puppeteer, {
    Browser,
    BrowserConnectOptions,
    BrowserContext,
    BrowserLaunchArgumentOptions,
    LaunchOptions,
} from "puppeteer";
import { LogLevel } from "..";
import { TestResult, Addon } from "./types";
import { CPUStats, getCPU } from "./utils/cpuUsage";
import { getCombinations } from "./utils/functions";
import { lhReport } from "./utils/lighthouse";
import { getMemory, MemoryStats } from "./utils/memoryUage";

const defaultOptions: Partial<ScraperOptions> = {
    lighthouse: false,
    interval: 60_000,
};
declare interface Scraper {
    on(event: "testsFinish", listener: (tests: TestResult) => void): this;
    on(event: "testsStart", listener: () => void): this;
    on(event: "testFinish", listener: (res: TestResult[keyof TestResult]) => void): this;
    on(event: "testStart", listener: (URL: string) => void): this;
    on(event: "addonFinish", listener: (addon: Addon, result: any) => void): this;
    on(event: "info", listener: (message: string) => void): this;
    on(event: "warn", listener: (message: string) => void): this;
    on(event: "error", listener: (message: string) => void): this;
    on(event: "debug", listener: (message: string) => void): this;

    on(event: string, listener: (...args: any[]) => void): this;
}
class Scraper extends EventEmitter {
    browser: Browser | null;
    options: ScraperOptions;
    interval: NodeJS.Timeout | null;
    results: TestResult[];
    constructor(options: ScraperOptions) {
        super();
        this.browser = null;
        this.options = { ...defaultOptions, ...options };
        this.interval = null;
        this.results = [];
    }
    private _emitLog(level: LogLevel, ...args: any[]) {
        switch (level) {
            case LogLevel.DEBUG:
                this.emit("debug", args.join("\n"));
                break;
            case LogLevel.WARN:
                this.emit("warn", args.join("\n"));
                break;
            case LogLevel.INFO:
                this.emit("info", args.join("\n"));
                break;
            case LogLevel.ERROR:
                this.emit("error", args.join("\n"));
                break;
        }
    }
    async start() {
        this.scrape();
        this.interval = setInterval(this.scrape.bind(this), this.options.interval);
        return this;
    }
    async initBrowser() {
        this.browser = await puppeteer.launch(this.options.puppeteerOptions);
        // Automatically reconnect puppeteer to chromium by killing the old instance and creating a new one
        this.browser.on("disconnected", () => {
            if (this.browser?.process() != null) this.browser?.process()?.kill("SIGINT");
            this.initBrowser();
            this._emitLog(LogLevel.WARN, "Browser got disconnected, resurrected puppeteer");
        });
        return this;
    }
    async scrape() {
        if (!this.browser) await this.initBrowser();
        const tests: TestResult = {};
        this.emit("testsStart");
        const testsStart = Date.now();
        for await (let URL of this.options.urls) {
            this._emitLog(LogLevel.DEBUG, `Starting testing for ${URL}`);
            this.emit("testStart", URL);
            try {
                const { result, lhr } = await this.test(URL);
                tests[URL] = { scrape: result, lhr };
            } catch (e) {
                this._emitLog(LogLevel.ERROR, `Test run failed for ${URL}: `, e);
            }
            this.emit("testFinish", tests[URL]);
        }
        const testsEnd = Date.now();
        this._emitLog(
            LogLevel.INFO,
            `Finished testing for each URL after ${ms(testsEnd - testsStart)}, next tests in ${ms(
                this.options.interval as number,
                {
                    long: true,
                }
            )} (${new Date(Date.now() + (this.options.interval as number)).toLocaleTimeString()})`
        );
        if (testsEnd - testsStart > (this.options.interval as number) && this.results.length === 0)
            this._emitLog(
                LogLevel.WARN,
                `The testing took longer than ${ms(this.options.interval as number, {
                    long: true,
                })}, consider augmenting the interval.`
            );
        this.emit("testsFinish", tests);
        return this;
    }
    async testPage(context: BrowserContext, url: string, addons: Addon[]) {
        const page = await context.newPage();
        await page.setCacheEnabled(false);
        page.setDefaultNavigationTimeout(60000);
        const before = addons.filter((e) => e.when === "before" || !e.when);
        this._emitLog(
            LogLevel.DEBUG,
            `Running addons that need to be ran before the test... (${before.length})`
        );

        for await (let addon of before)
            try {
                const res = await addon.run(context, page, url);
                this.emit("addonFinish", addon, res);
            } catch (e) {
                this._emitLog(LogLevel.WARN, `Failed to run the "${addon.name}" addon: `, e);
            }

        const start = Date.now();
        const devTools = page.client();
        const cpuMeter = await getCPU(devTools, 100);
        let bytesIn = 0;
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
        this._emitLog(LogLevel.DEBUG, `Finished performance test for ${url}`);
        const after = addons.filter((e) => e.when === "after");
        this._emitLog(
            LogLevel.DEBUG,
            `Running addons that need to be ran after the test... (${after.length})`
        );
        for await (let addon of after)
            try {
                const res = await addon.run(context, page, url);
                this.emit("addonFinish", addon, res);
            } catch (e) {
                this._emitLog(LogLevel.WARN, `Failed to run the "${addon.name}" addon: `, e);
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
            this._emitLog(LogLevel.DEBUG, "Running LightHouse...");
            const lhStart = Date.now();
            lhr = await lhReport(this.browser, URL);
            const lhEnd = Date.now();
            this._emitLog(
                LogLevel.DEBUG,
                `Ran LightHouse in ${ms(lhEnd - lhStart, { long: true })}`
            );
        }
        return { result: res, lhr };
    }
    async stop() {
        this._emitLog(LogLevel.DEBUG, "Stopping scraper...");
        await this.browser?.close();
        this.interval && clearInterval(this.interval);
        return this;
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
}
interface ScrapeResult {
    cpuMetrics: CPUStats;
    memoryMetrics: MemoryStats;
    duration: number;
    bytesIn: number;
}
export { Scraper, ScraperOptions, ScrapeResult };
