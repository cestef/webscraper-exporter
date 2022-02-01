import { BrowserContext, Page } from "puppeteer";
import type { ScrapeResult } from ".";

export interface TestResult {
    [url: string]: {
        scrape: {
            test: ScrapeResult;
            addons: IAddon[];
        }[];
    };
}

export interface IAddon {
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

    run: (browser: BrowserContext, page: Page, URL: string) => Promise<any> | any;
}
