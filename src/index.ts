import type { ScraperOptions } from "./scraper";
import type { ExporterOptions } from "./exporter";
export { Scraper, ScraperOptions } from "./scraper";
export { Exporter, ExporterOptions } from "./exporter";
export interface WsceConfig {
    scraper: ScraperOptions;
    exporter: ExporterOptions;
}
