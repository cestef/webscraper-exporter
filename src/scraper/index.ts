import { CPUStats, getCPU } from "./utils/cpuUsage";
import { IAddon, LogLevel } from "..";
import { MemoryStats, getMemory } from "./utils/memoryUage";
import { blueBright, dim, redBright, yellow } from "colorette";
import puppeteer, {
    Browser,
    BrowserConnectOptions,
    BrowserContext,
    BrowserLaunchArgumentOptions,
    LaunchOptions,
} from "puppeteer-core";

import { EventEmitter } from "events";
import Queue from "p-queue";
import { TestResult } from "./types";
import downloadChromium from "download-chromium";
import { getCombinations } from "./utils/functions";
import { hasChromiumInPath } from "../utils/findChromium";
import ms from "ms";

const defaultOptions: Partial<ScraperOptions> = {
    interval: 60_000,
    concurrentTests: 1,
    queueThreshold: 10,
};
declare interface Scraper {
    on(event: "browserReady", listener: (browser: Browser) => void): this;
    on(event: "browserDisconnected", listener: (browser: Browser) => void): this;
    on(event: "testsFinish", listener: (tests: TestResult) => void): this;
    on(event: "testsStart", listener: () => void): this;
    on(event: "testFinish", listener: (res: TestResult[keyof TestResult]) => void): this;
    on(event: "testStart", listener: (URL: string) => void): this;
    on(event: "addonFinish", listener: (addon: IAddon, result: any) => void): this;
    on(event: "info", listener: (message: string[]) => void): this;
    on(event: "warn", listener: (message: string[]) => void): this;
    on(event: "error", listener: (message: string[]) => void): this;
    on(event: "debug", listener: (message: string[]) => void): this;

    on(event: string, listener: (...args: any[]) => void): this;
}
class Scraper extends EventEmitter {
    browser: Browser | null;
    options: ScraperOptions;
    interval: number | null = null;
    queue: Queue<any>;
    results: TestResult[];
    running: boolean;
    stopped: number;
    constructor(options: ScraperOptions) {
        super();
        this.running = false;
        this.stopped = 0;
        this.browser = null;
        this.options = { ...defaultOptions, ...options };
        this.queue = new Queue({
//            concurrency: this.options.forceRecreateBrowser ? 1 : options.concurrentTests,
	  concurrency: 1
        });
        this.results = [];
    }
    private _emitLog(level: LogLevel, ...args: any[]) {
        switch (level) {
            case LogLevel.DEBUG:
                this.emit("debug", args);
                break;
            case LogLevel.WARN:
                this.emit("warn", args);
                break;
            case LogLevel.INFO:
                this.emit("info", args);
                break;
            case LogLevel.ERROR:
                this.emit("error", args);
                break;
        }
    }
    private bindListeners() {
        this.queue.on("add", () => {
            if (this.queue.size >= (this.options.queueThreshold as number)) {
                this._emitLog(
                    LogLevel.ERROR,
                    `The tests queue exceeded ${redBright(
                        this.options.queueThreshold as number
                    )} jobs, exitting.`
                );
                process.exit(1);
            }
        });
    }
    async start() {
        this._emitLog(LogLevel.DEBUG, "Starting the scraper");
        this.bindListeners();
        this.queue
            .add(async () => {
                await this.scrape();
            })
            .catch((e) => {
                this._emitLog(LogLevel.ERROR, "Error in the scraper queue", e);
            })
            .finally(() => {
                this.interval = setInterval(
                    () =>
                        this.queue.add(async () => {
                            await this.scrape();
                        }),
                    this.options.interval
                );
            });
        return this;
    }
    private async initBrowser() {
        this.browser?.removeAllListeners();
        if (this.browser && this.options.forceRecreateBrowser) {
            this._emitLog(LogLevel.DEBUG, "Forcing browser recreation");
            await this.browser?.close();
            this.browser = null;
        }
        let chromiumPath = await hasChromiumInPath();
        if (!chromiumPath) {
            this._emitLog(LogLevel.INFO, "Downloading Chromium");
            chromiumPath = (await downloadChromium({
                revision: "991974",
                installPath: "/var/tmp/.local-chromium",
            })) as string;
            this._emitLog(LogLevel.DEBUG, `Chromium downloaded to ${dim(chromiumPath)}`);
        } else this._emitLog(LogLevel.DEBUG, `Chromium found at ${dim(chromiumPath)}`);

        this.browser = await puppeteer.launch({
            ...this.options.puppeteerOptions,
            defaultViewport: { width: 1920, height: 1080 },
            ...(this.options.puppeteerOptions?.executablePath && chromiumPath
                ? null
                : { executablePath: chromiumPath }),
        });
        // Automatically reconnect puppeteer to chromium by killing the old instance and creating a new one
        this.browser.on("disconnected", async () => {
            this.emit("browserDisconnected", this.browser);
            if (this.browser?.process?.() != null) this.browser?.process?.()?.kill?.("SIGINT");
            this._emitLog(LogLevel.WARN, "Browser got disconnected, resurrecting puppeteer");
            await this.initBrowser();
        });
        this.emit("browserReady", this.browser);
        return this;
    }
    private async scrape() {
        this.running = true;
        await this.initBrowser();
        const tests: TestResult = {};
        this.emit("testsStart");
        if (this.options.urls.length === 0)
            this._emitLog(LogLevel.WARN, "You didn't provide any url for testing");
        const testsStart = Date.now();
        for (let URL of this.options.urls) {
            this._emitLog(LogLevel.DEBUG, `Starting testing for ${dim(URL)}`);
            this.emit("testStart", URL);
            try {
                const { result } = await this.test(URL);
                tests[URL] = { scrape: result };
            } catch (e) {
                this._emitLog(LogLevel.ERROR, `Test run failed for ${redBright(URL)}: `, e);
            }
            this.emit("testFinish", tests[URL]);
        }
        const testsEnd = Date.now();
        this._emitLog(
            LogLevel.INFO,
            `Finished testing for each URL after ${blueBright(
                ms(testsEnd - testsStart)
            )}, next tests are in ${blueBright(
                ms((this.options.interval as number) - (testsEnd - testsStart), {
                    long: true,
                })
            )} (${blueBright(
                new Date(
                    Date.now() + ((this.options.interval as number) - (testsEnd - testsStart))
                ).toLocaleTimeString()
            )})`
        );
        if (testsEnd - testsStart > (this.options.interval as number) && this.results.length === 0)
            this._emitLog(
                LogLevel.WARN,
                `The testing took longer than ${yellow(
                    ms(this.options.interval as number, {
                        long: true,
                    })
                )}, consider augmenting the interval`
            );
        this.emit("testsFinish", tests);
        this.running = false;
        return this;
    }
    private async testPage(context: BrowserContext, url: string, addons: IAddon[]) {
        this._emitLog(LogLevel.DEBUG, "Creating new page");

        const page = await context.newPage();
        this._emitLog(LogLevel.DEBUG, "Created new page");

        await page.setCacheEnabled(false);
        page.setDefaultNavigationTimeout(60000);
        const before = addons.filter((e) => e.when === "before" || !e.when) as IAddon<"before">[];
        this._emitLog(
            LogLevel.DEBUG,
            `Running addons that need to be ran before the test (${dim(before.length)})`
        );
        for (let addon of before)
            try {
                const res = await addon.run(context, page, url);
                this.emit("addonFinish", addon, res);
            } catch (e) {
                this._emitLog(
                    LogLevel.WARN,
                    `Failed to run the ${redBright(addon.name)} addon:`,
                    e
                );
            }
        const start = Date.now();
        const devTools = await page.target().createCDPSession();
        const cpuMeter = await getCPU(devTools, 100);
        let bytesIn = 0;
        await devTools.send("Network.enable");
        devTools.on("Network.loadingFinished", (event) => (bytesIn += event.encodedDataLength));
        this._emitLog(LogLevel.DEBUG, `Navigating to ${dim(url)}`);
        await page.goto(url, { waitUntil: "networkidle2" });
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
        await page.setViewport({ width: bodyWidth, height: bodyHeight });
        const cpuMetrics = cpuMeter();
        const memoryMetrics = await getMemory(page, devTools);
        const ttfb = await page.evaluate(
            () => window.performance.timing.responseStart - window.performance.timing.requestStart
        );
        const end = Date.now();
        this._emitLog(LogLevel.DEBUG, `Finished performance test for ${dim(url)}`);
        const after = addons.filter((e) => e.when === "after") as IAddon<"after">[];
        this._emitLog(
            LogLevel.DEBUG,
            `Running addons that need to be ran after the test (${dim(after.length)})`
        );
        const scrapeRes = { cpuMetrics, memoryMetrics, duration: end - start, bytesIn, ttfb };
        for (let addon of after)
            try {
                const res = await addon.run(context, page, url, scrapeRes);
                this.emit("addonFinish", addon, res);
            } catch (e) {
                this._emitLog(
                    LogLevel.WARN,
                    `Failed to run the ${redBright(addon.name)} addon: `,
                    e
                );
            }
        // Cleanup after the test
        devTools.removeAllListeners();
        await devTools.send("Network.disable");
        devTools.detach();
        await page.close();
        return scrapeRes;
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
        for (let currentTests of combinations) {
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
        if (this.running && this.stopped < 1) {
            this.stopped++;
            setTimeout(() => this.stopped--, 2000);
            this._emitLog(
                LogLevel.WARN,
                "There are still tests running, waiting for them to finish before shutting down"
            );
            await new Promise<void>((r) => {
                this.once("testsFinish", () => r());
            });
        }
        this._emitLog(LogLevel.DEBUG, "Killing puppeteer and stopping the scraper");
        this.removeAllListeners();
        await this.browser?.close();
        this.browser = null;
        this.interval && clearInterval(this.interval);
        return this;
    }
}

interface ScraperOptions {
    /**
     * Array of URLs to test
     */
    urls: string[];
    /**
     * Custom options passer to the `puppeteer.launch()` function
     */
    puppeteerOptions?: LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions;
    addons: IAddon[];
    /**
     * The interval in ms to run the scraper.
     * @default 60000
     */
    interval?: number;
    /**
     * Force the browser recreation for each test
     */
    forceRecreateBrowser?: boolean;
    /**
     * Maximum tests to be ran at the same time
     * WARNING: If `forceRecreateBrowser` is set to true, this will automatically be set to 1
     * @default 1
     */
    concurrentTests?: number;
    /**
     * Maximum tests queue size, the program will exit when the queue exceeds this size
     * @default 10
     */
    queueThreshold?: number;
}
interface ScrapeResult {
    cpuMetrics: CPUStats;
    memoryMetrics: MemoryStats;
    duration: number;
    bytesIn: number;
    ttfb: number;
}
export { Scraper, ScraperOptions, ScrapeResult };
