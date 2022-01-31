import { join } from "path";
import Yargs from "yargs";
import { Exporter, ExporterOptions, Scraper, ScraperOptions } from "../../index";
import Logger from "../../utils/Logger";
import beforeShutdown from "../../shutdown";
import bindLogs from "../../utils/bindLogs";
import { validateConfig } from "../schema";

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
        });

export const handler = async (args: any) => {
    const logger = new Logger(true, args.v + 2);
    let config: { scraper: ScraperOptions; exporter: ExporterOptions } | null = null;
    try {
        const imported = await import(args.config.trim());
        config = imported?.default || imported;
    } catch (e) {
        logger.debug("Couldn't load absolute path, trying relative: ", e);
        try {
            const imported = await import(join(process.cwd().trim(), args.config.trim()));
            config = imported?.default || imported;
        } catch (e) {
            logger.warn(`Couldn't load the config, falling back to default.`);
            logger.debug(e);
            try {
                const defaultConfig = await import(
                    join(__dirname, "../../..", "config", "default.wsce.config.js")
                );
                config = defaultConfig?.default || defaultConfig;
            } catch (e) {
                logger.error("Couldn't load default config: ", e);
            }
        }
    }
    if (!config) return logger.error("Couldn't load the config...");
    const validationRes = validateConfig(config);
    if (validationRes.error) return logger.error(validationRes.error.annotate());
    const urls = args.urls?.split(/,| ,/g).filter(Boolean);
    const scraper = new Scraper({
        ...config.scraper,
        ...(urls && urls?.length > 0 && { urls }),
        ...(typeof args.interval !== "undefined" && { port: args.interval }),
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
