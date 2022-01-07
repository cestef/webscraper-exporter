import ms from "ms";
import type {
    Browser,
    BrowserConnectOptions,
    BrowserContext,
    BrowserLaunchArgumentOptions,
    LaunchOptions,
    Page,
} from "puppeteer";
import puppeteer from "puppeteer";
import Logger from "../Logger";
import { TestResult } from "./types";
import { test } from "./utils/scraper";
import level, { LevelDB } from "level";
import { join } from "path";

const defaultOptions: Partial<ScraperOptions> = {
    verbose: false,
    lighthouse: false,
    interval: 60_000,
    dbPath: join(__dirname, "../..", "data"),
};

class Scraper {
    browser: Browser | null;
    options: ScraperOptions;
    interval: NodeJS.Timeout | null;
    results: TestResult[];
    logger: Logger;
    db: LevelDB;
    constructor(options: ScraperOptions) {
        this.browser = null;
        this.options = { ...defaultOptions, ...options };
        this.db = level(this.options.dbPath as string);
        this.interval = null;
        this.results = [];
        this.logger = new Logger(Boolean(this.options.verbose));
    }
    async start() {
        await this.scrape();
        this.interval = setInterval(() => this.scrape(), this.options.interval);
    }
    async scrape() {
        if (!this.browser) this.browser = await puppeteer.launch(this.options.puppeteerOptions);
        const tests: TestResult = {};
        const testsStart = Date.now();
        for await (let URL of this.options.urls) {
            this.logger.debug(`Starting testing for ${URL}`);
            const { result, lhr } = await test(this.browser, this.options, URL);
            tests[URL] = { scrape: result, lhr };
            this.logger.debug(`Finished testing for ${URL}`);
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
        this.results.push(tests);
    }
    async stop() {
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
    /**
     * Path to the LevelDB file
     */
    dbPath?: string;
}
interface Condition {
    name: string;
    twice: boolean;
    run: (browser: BrowserContext, page: Page, URL: string) => Promise<any>;
}

export { Scraper, ScraperOptions, Condition };
