import ms from "ms";
import {
    Browser,
    BrowserConnectOptions,
    BrowserContext,
    BrowserLaunchArgumentOptions,
    LaunchOptions,
    Page,
} from "puppeteer";
import { EventEmitter } from "events";
import puppeteer from "puppeteer";
import Logger from "../Logger.js";
import { TestResult } from "./types.js";
import { test } from "./utils/scraper.js";

const defaultOptions: Partial<ScraperOptions> = {
    verbose: 3,
    lighthouse: false,
    interval: 60_000,
};
declare interface Scraper {
    on(event: "testsFinish", listener: (tests: TestResult) => void): this;
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
        const testsStart = Date.now();
        for await (let URL of this.options.urls) {
            this.logger.debug(`Starting testing for ${URL}`);
            try {
                const { result, lhr } = await test(this.browser, this.options, URL, this.logger);
                tests[URL] = { scrape: result, lhr };
            } catch (e) {
                this.logger.error(`Test run failed for ${URL}, check debug for error`);
                this.logger.debug(e);
            }
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
interface Addon {
    /**
     * Unique name for this addon
     */
    name: string;
    /**
     * Whether the test should be ran with and without this addon
     * @default false
     */
    twice?: boolean;
    /**
     * When to run the addon
     * @default "before"
     */
    when?: "before" | "after";

    run: (browser: BrowserContext, page: Page, URL: string) => Promise<any>;
}

export { Scraper, ScraperOptions, Addon };
