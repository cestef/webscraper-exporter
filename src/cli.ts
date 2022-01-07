#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { ExporterOptions, Exporter } from "./exporter";
import { ScraperOptions, Scraper } from "./scraper";
import { join } from "path";
(async () => {
    const args = await yargs(hideBin(process.argv))
        .option("config", {
            alias: "c",
            type: "string",
            default: join(process.cwd(), "wsce.config.js"),
            description: "The config file path",
        })
        .option("verbose", {
            alias: "v",
            type: "boolean",
            default: false,
            description: "Whether to print detailled logs or not",
        })
        .parse();
    let config: { scraper: ScraperOptions; exporter: ExporterOptions };
    try {
        config = await import(args.config);
    } catch (e) {
        throw new Error("Couldn't load the config: " + e);
    }
    const scraper = new Scraper({ ...config.scraper, verbose: args.verbose });
    const exporter = new Exporter({ ...config.exporter, verbose: args.verbose });
    await scraper.start();
})();
