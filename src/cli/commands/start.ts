import { join, parse } from "path";
import Yargs from "yargs";
import { Exporter, ExporterOptions, Scraper, ScraperOptions } from "../..";
import {
    findConfig,
    loadConfig as load,
    beforeShutdown,
    bindLogs,
    portInUse,
    Logger,
} from "../../utils";
import { validateConfig } from "../schema";
import { prompt } from "inquirer";
import { bold, whiteBright } from "colorette";
import shorten from "path-shorten";

export const command = "start";

export const describe = "Start the exporter";

export const builder = (yargs: typeof Yargs) =>
    yargs
        .option("config", {
            alias: "c",
            type: "string",
            description: "Config file path",
        })
        .option("verbose", {
            alias: "v",
            type: "boolean",
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
            description: "Port for the exporter to listen on",
        })
        .option("interval", {
            alias: "i",
            type: "number",
            description: "Scraper interval",
        })
        .option("yes", {
            alias: "y",
            type: "boolean",
            description:
                "Whether to skip interactive questions and choose the default response or not",
        })
        .option("nocolor", {
            type: "boolean",
            description: "Whether to print debug logs with colors or not",
        })
        .option("depth", {
            type: "number",
            description: "Number of subdirs to be searched in for the config",
        });

export const handler = async (args: any) => {
    const logger = new Logger(true, args.v ? 3 : 2, args.nocolor);
    let config: { scraper: ScraperOptions; exporter: ExporterOptions } | null = null;
    let path: string = "";

    const loadDefault = async () => {
        logger.warn("Falling back to default config.");
        const defaultPath = join(__dirname, "../../..", "config", "default.wsce.config.js");
        const loaded = await load(defaultPath);
        if (!loaded.config) throw new Error(`Couldn't load default config. ${loaded.error}`);
        config = loaded.config;
        path = defaultPath;
    };
    if (args.config) {
        let loaded = await load(args.config);
        if (!loaded.config) {
            await loadDefault();
            logger.debug(loaded.error);
        } else {
            config = loaded.config;
            path = args.config;
        }
    } else {
        let configPaths = findConfig(process.cwd(), args.depth, logger);
        switch (configPaths.length) {
            case 0: {
                logger.warn("No config found in the cwd.");
                await loadDefault();
                break;
            }
            case 1: {
                const loaded = await load(configPaths[0]);
                if (!loaded.config) await loadDefault();
                else {
                    config = loaded.config;
                    path = configPaths[0];
                }
                break;
            }
            default: {
                const { selected } = await prompt({
                    message: "Multiple configs were found, select the one you want to use",
                    name: "selected",
                    type: "list",
                    choices: configPaths.map((e) => {
                        const parsed = parse(e);
                        return {
                            name: join(
                                shorten(parsed.dir, { length: 4 }),
                                whiteBright(bold(parsed.base))
                            ),
                            value: e,
                        };
                    }),
                    when: !args.yes,
                });
                path = selected || configPaths[0];
                const loaded = await load(path);
                if (!loaded.config) {
                    logger.debug(loaded.error);
                    await loadDefault();
                } else config = loaded.config;
                break;
            }
        }
    }
    if (!config) return logger.error("Couldn't load the config...");
    const validationRes = validateConfig(config);
    if (validationRes.error) return logger.error(validationRes.error.annotate());
    logger.debug(`Using ${parse(path).base} as config.`);
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
    if (await portInUse(exporter.options.port)) {
        const { useNewPort } = await prompt({
            name: "useNewPort",
            message: `The port ${exporter.options.port} is already in use, do you want to use another port ?`,
            type: "confirm",
        });
        if (useNewPort) {
            exporter.options.port++;
        } else return process.exit();
    }
    scraper.start();

    exporter.start();
    beforeShutdown(async (code: any) => {
        exporter.stop();
        await scraper.stop();
        process.exit(code);
    });
};
