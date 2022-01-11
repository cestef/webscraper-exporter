import Yargs, { Argv } from "yargs";
import { join } from "path";
import { ScraperOptions, ExporterOptions, Scraper, Exporter } from "../..";
import beforeShutdown from "../../shutdown";
import Logger from "../../Logger";
exports.command = "start [path]";

exports.describe = "Start the exporter";

exports.builder = (yargs: typeof Yargs) =>
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
        .default("config", join(process.cwd(), "wsce.config.js"), "wsce.config.js")
        .option("verbose", {
            alias: "v",
            type: "boolean",
            description: "Print debug logs",
            count: true,
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

exports.handler = async (args: any) => {
    const logger = new Logger(true, args.v);
    let config: { scraper: ScraperOptions; exporter: ExporterOptions };
    try {
        const imported = await import(args.config);
        config = imported?.default || imported;
    } catch (e) {
        logger.warn(`Couldn't load the config, falling back to default.`);
        const defaultConfig = await import(join(__dirname, "../../..", "default.wsce.config.js"));
        config = defaultConfig?.default || defaultConfig;
    }
    if (!config) return logger.error("Couldn't load the config...");
    const urls = args.urls?.split(/,| ,/g).filter(Boolean);
    const scraper = new Scraper({
        ...config.scraper,
        verbose: args.verbose,
        ...(urls && urls?.length > 0 && { urls }),
        ...(typeof args.interval !== "undefined" && { port: args.interval }),
        ...(typeof args.lighthouse !== "undefined" && { port: args.lighthouse }),
    });
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
};
