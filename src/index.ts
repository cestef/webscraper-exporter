import type { ScraperOptions } from "./scraper/index.js";
import type { ExporterOptions } from "./exporter/index.js";
export { Scraper, ScraperOptions } from "./scraper/index.js";
export { Exporter, ExporterOptions } from "./exporter/index.js";
export interface WsceConfig {
    scraper: ScraperOptions;
    exporter: Omit<ExporterOptions, "scraper">;
}
