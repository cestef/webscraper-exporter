import { join } from "path";
import Yargs from "yargs";
import { Exporter, ExporterOptions, Scraper, ScraperOptions } from "../../index";
import Logger from "../../utils/Logger";
import beforeShutdown from "../../shutdown";
import { EventEmitter } from "events";
import bindLogs from "../../utils/bindLogs";

export const command = "start [path]";

export const describe = "Start the exporter";

export const builder = (yargs: typeof Yargs) =>
    yargs
        .positional("path", {
            describe: "Path to the project to start",
            type: "string",
            default: ".",
        })
        .option("config", {
            alias: "c",
            type: "string",
            description: "The config file path",
        })
        .default("config", "wsce.config.js")
        .option("verbose", {
            alias: "v",
            type: "boolean",
            description: "Print debug logs",
            count: true,
            default: 0,
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
        });

export const handler = async (args: any) => {
    const logger = new Logger(true, args.v + 2);
    let config: { scraper: ScraperOptions; exporter: ExporterOptions };
    try {
        const imported = await import(args.config);
        config = imported?.default || imported;
    } catch {
        try {
            const imported = await import(join(process.cwd(), args.config));
            config = imported?.default || imported;
        } catch (e) {
            logger.warn(`Couldn't load the config, falling back to default.`);
            logger.debug(e);
            const defaultConfig = await import(
                join(__dirname, "../../..", "default.wsce.config.js")
            );
            config = defaultConfig?.default || defaultConfig;
        }
    }
    if (!config) return logger.error("Couldn't load the config...");
    const urls = args.urls?.split(/,| ,/g).filter(Boolean);
    const scraper = new Scraper({
        ...config.scraper,
        ...(urls && urls?.length > 0 && { urls }),
        ...(typeof args.interval !== "undefined" && { port: args.interval }),
        ...(typeof args.lighthouse !== "undefined" && { port: args.lighthouse }),
    });
    const exporter = new Exporter({
        ...config.exporter,
        scraper,
        ...(typeof args.port !== "undefined" && { port: args.port }),
    });
    bindLogs(logger, scraper, exporter);
    scraper.start();
    exporter.start();
    beforeShutdown(async (code: any) => {
        exporter.stop();
        await scraper.stop();
        process.exit(code);
    });
};
