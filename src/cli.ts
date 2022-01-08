#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { ExporterOptions, Exporter } from ".";
import { ScraperOptions, Scraper } from ".";
import { join } from "path";
import beforeShutdown from "./shutdown";
(async () => {
    const args = await yargs(hideBin(process.argv))
        .option("port", {
            alias: "p",
            type: "number",
            default: 3000,
            description: "The port for the exporter",
        })
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
    const exporter = new Exporter({
        ...config.exporter,
        verbose: args.verbose,
        port: args.port,
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
