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
import { TestResult, IAddon } from "./types";
import { CPUStats, getCPU } from "./utils/cpuUsage";
import { getCombinations } from "./utils/functions";
import { getMemory, MemoryStats } from "./utils/memoryUage";

const defaultOptions: Partial<ScraperOptions> = {
    interval: 60_000,
};
declare interface Scraper {
    on(event: "browserReady", listener: (browser: Browser) => void): this;
    on(event: "browserDisconnected", listener: () => void): this;
    on(event: "testsFinish", listener: (tests: TestResult) => void): this;
    on(event: "testsStart", listener: () => void): this;
    on(event: "testFinish", listener: (res: TestResult[keyof TestResult]) => void): this;
    on(event: "testStart", listener: (URL: string) => void): this;
    on(event: "addonFinish", listener: (addon: IAddon, result: any) => void): this;
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
        await this.initBrowser();
        this.scrape();
        this.interval = setInterval(this.scrape.bind(this), this.options.interval);
        return this;
    }
    private async initBrowser() {
        this.browser?.removeAllListeners();
        this.browser = await puppeteer.launch(this.options.puppeteerOptions);
        // Automatically reconnect puppeteer to chromium by killing the old instance and creating a new one
        this.browser.on("disconnected", () => {
            this.emit("browserDisconnected");
            if (this.browser?.process() != null) this.browser?.process()?.kill("SIGINT");
            this.initBrowser();
            this._emitLog(LogLevel.WARN, "Browser got disconnected, resurrected puppeteer");
        });
        this.emit("browserReady", this.browser);
        return this;
    }
    private async scrape() {
        if (!this.browser) await this.initBrowser();
        const tests: TestResult = {};
        this.emit("testsStart");
        if (this.options.urls.length === 0)
            this._emitLog(LogLevel.WARN, "You didn't provide any url for testing.");
        const testsStart = Date.now();
        for await (let URL of this.options.urls) {
            this._emitLog(LogLevel.DEBUG, `Starting testing for ${URL}`);
            this.emit("testStart", URL);
            try {
                const { result } = await this.test(URL);
                tests[URL] = { scrape: result };
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
    private async testPage(context: BrowserContext, url: string, addons: IAddon[]) {
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
    private async test(URL: string) {
        if (!this.browser) {
            throw new Error("Tried to start a test without init'ing the scraper");
        }
        let res: {
            test: ScrapeResult;
            addons: IAddon[];
        }[] = [];
        let addons: { addon: IAddon; status: boolean }[] = [];

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
        return { result: res };
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
    addons: IAddon[];
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
