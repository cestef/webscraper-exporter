import { BrowserContext, Page } from "puppeteer";
import type { ScrapeResult } from ".";
import { Logger } from "..";

export interface TestResult {
    [url: string]: {
        scrape: {
            test: ScrapeResult;
            addons: Addon[];
        }[];
        lhr?: {
            [key: string]: any;
            categories: {
                [category: string]: {
                    score: number;
                    [key: string]: any;
                };
            };
        };
    };
}

export interface Config {
    login: boolean | { email: string; password: string };
    testBoth: {
        login: boolean;
        emulateNetwork: boolean;
    };
    urls: string[];
    headless: boolean;
    emulateNetwork: boolean | { upload: number; download: number; latency: number };
    throttleCPU: boolean | number;
}

export interface Addon {
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

    run: (browser: BrowserContext, page: Page, URL: string, logger: Logger) => Promise<any> | any;
}
