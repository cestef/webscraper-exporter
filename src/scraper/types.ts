import { Condition } from ".";
import type { ScrapeResult } from "./utils/scraper";

export interface TestResult {
    [url: string]: {
        scrape: {
            scrape: ScrapeResult;
            conditions: Condition[];
        }[];
        lhr: {
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
