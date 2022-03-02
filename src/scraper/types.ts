import type { ScrapeResult } from ".";
import { IAddon } from "../utils";

export interface TestResult {
    [url: string]: {
        scrape: {
            test: ScrapeResult;
            addons: IAddon[];
        }[];
    };
}
