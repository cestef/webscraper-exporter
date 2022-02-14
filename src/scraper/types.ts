import type { ScrapeResult } from ".";
import { IAddon } from "../utils/Addon";

export interface TestResult {
    [url: string]: {
        scrape: {
            test: ScrapeResult;
            addons: IAddon[];
        }[];
    };
}
