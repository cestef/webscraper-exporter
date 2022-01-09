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
import Logger from "../Logger";
import { TestResult } from "./types";
import { test } from "./utils/scraper";

const defaultOptions: Partial<ScraperOptions> = {
    verbose: false,
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
        this.logger = new Logger(Boolean(this.options.verbose));
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
            const { result, lhr } = await test(this.browser, this.options, URL);
            tests[URL] = { scrape: result, lhr };
        }
        const testsEnd = Date.now();
        this.logger.info(
            `Finished testing for each URL, next tests in ${ms(this.options.interval as number, {
                long: true,
            })} (${new Date(Date.now() + (this.options.interval as number)).toLocaleTimeString()})`
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
    conditions: Condition[];
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
     * @default false
     */
    verbose?: boolean;
}
interface Condition {
    /**
     * Unique name for this condition
     */
    name: string;
    /**
     * Whether the test should be ran with and without this condition
     */
    twice: boolean;
    run: (browser: BrowserContext, page: Page, URL: string) => Promise<any>;
}

export { Scraper, ScraperOptions, Condition };
