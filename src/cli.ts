#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { ExporterOptions, Exporter } from ".";
import { ScraperOptions, Scraper } from ".";
import { join } from "path";
import beforeShutdown from "./shutdown";
(async () => {
    const args = await yargs(hideBin(process.argv))
        .help()
        .alias("h", "help")
        .option("config", {
            alias: "c",
            type: "string",
            description: "The config file path",
        })
        .default("config", join(process.cwd(), "wsce.config.js"), "wsce.config.js")
        .option("verbose", {
            alias: "v",
            type: "boolean",
            default: false,
            description: "Print debug logs",
        })
        .parse();
    let config: { scraper: ScraperOptions; exporter: ExporterOptions };
    try {
        config = await import(args.config);
    } catch (e) {
        throw new Error("Couldn't load the config: " + e);
    }
    const scraper = new Scraper({ ...config.scraper, verbose: args.verbose });
    const exporter = new Exporter({
        ...config.exporter,
        verbose: args.verbose,
        scraper,
    });
    scraper.start();
    exporter.start();
    beforeShutdown(async (code: any) => {
        exporter.stop();
        await scraper.stop();
        process.exit(code);
    });
})();
