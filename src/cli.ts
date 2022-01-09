#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { ExporterOptions, Exporter } from ".";
import { ScraperOptions, Scraper } from ".";
import { join } from "path";
import beforeShutdown from "./shutdown";
import Logger from "./Logger";

(async () => {
    const logger = new Logger(false);
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
        .option("urls", {
            alias: "u",
            type: "string",
            description: "Comma-separated URLs",
        })
        .option("port", {
            alias: "p",
            type: "number",
            description: "Exporter port",
        })
        .option("interval", {
            alias: "i",
            type: "number",
            description: "Scraper interval",
        })
        .option("lighthouse", {
            alias: "l",
            type: "boolean",
            description: "Run lighthouse tests",
        })
        .parse();
    let config: { scraper: ScraperOptions; exporter: ExporterOptions };
    try {
        config = await import(args.config);
    } catch (e) {
        logger.warn(`Couldn't load the config, falling back to default.`);
        config = await import(join(__dirname, "..", "default.wsce.config.js"));
    }
    const urls = args.urls?.split(/,| ,/g).filter(Boolean);
    const scraper = new Scraper({
        ...config.scraper,
        verbose: args.verbose,
        ...(urls && urls?.length > 0 && { urls }),
        ...(typeof args.interval !== "undefined" && { port: args.interval }),
        ...(typeof args.lighthouse !== "undefined" && { port: args.lighthouse }),
    });
    console.log(scraper.options);
    const exporter = new Exporter({
        ...config.exporter,
        verbose: args.verbose,
        scraper,
        ...(typeof args.port !== "undefined" && { port: args.port }),
    });
    scraper.start();
    exporter.start();
    beforeShutdown(async (code: any) => {
        exporter.stop();
        await scraper.stop();
        process.exit(code);
    });
})();
