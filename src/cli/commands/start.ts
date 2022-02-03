import { join, parse } from "path";
import Yargs from "yargs";
import { Exporter, ExporterOptions, Scraper, ScraperOptions } from "../../index";
import Logger from "../../utils/Logger";
import beforeShutdown from "../../shutdown";
import bindLogs from "../../utils/bindLogs";
import { validateConfig } from "../schema";
import findConfig from "../../utils/config";
import { load } from "../../utils/config";
import { prompt } from "inquirer";
import { bold, whiteBright } from "colorette";
import shorten from "path-shorten";
import portInUse from "../../utils/portInUse";

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
    const loadDefault = async () => {
        logger.warn("Falling back to default config.");
        const loaded = await load(join(__dirname, "../../..", "config", "default.wsce.config.js"));
        if (!loaded.config) throw new Error(`Couldn't load default config. ${loaded.error}`);
        config = loaded.config;
    };
    if (args.config) {
        let loaded = await load(args.config);
        if (!loaded.config) await loadDefault();
        else config = loaded.config;
    } else {
        let configPaths = findConfig(process.cwd());
        switch (configPaths.length) {
            case 0: {
                logger.warn("No config found in the cwd.");
                await loadDefault();
                break;
            }
            case 1: {
                const loaded = await load(configPaths[0]);
                if (!loaded.config) await loadDefault();
                else config = loaded.config;
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
                            name: join(shorten(parsed.dir), whiteBright(bold(parsed.base))),
                            value: e,
                        };
                    }),
                });
                const loaded = await load(selected);
                if (!loaded.config) await loadDefault();
                else config = loaded.config;
                break;
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
