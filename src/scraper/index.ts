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
import { test, ScrapeResult } from "./utils/scraper";
import level, { LevelDB } from "level";
import { join } from "path";
import { Histogram } from "prom-client";

const defaultOptions: Partial<ScraperOptions> = {
    verbose: false,
    lighthouse: false,
    interval: 60_000,
    dbPath: join(__dirname, "../..", "data"),
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
    db: LevelDB;
    constructor(options: ScraperOptions) {
        super();
        this.browser = null;
        this.options = { ...defaultOptions, ...options };
        this.db = level(this.options.dbPath as string);
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
        await this._setJSON("results", (await this._getJSON("results", [])).concat(tests));
    }
    private async _getJSON<K = any>(key: string, defaultValue?: any): Promise<K> {
        let value;
        try {
            value = await this.db.get(key);
        } catch {
            value = defaultValue || null;
        }
        return JSON.parse(value);
    }
    private async _setJSON(key: string, value: any): Promise<void> {
        return await this.db.put(key, JSON.stringify(value));
    }
    async stop() {
        this.logger.debug("Stopping scraper...");
        await this.browser?.close();
        this.interval && clearInterval(this.interval);
    }
    async getTests(): Promise<TestResult[]> {
        return await this._getJSON("results", []);
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
