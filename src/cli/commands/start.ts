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
import { blueBright, bold, underline, whiteBright, dim } from "colorette";
import shorten from "path-shorten";
import rl from "readline";

import { watch } from "fs/promises";
import { inspect } from "util";
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
            alias: ["nc", "nocolors"],
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
    const ac = new AbortController();
    const configWatcher = watch(path, { signal: ac.signal });

    if (!config) return logger.error("Couldn't load the config");
    const validationRes = validateConfig(config);
    if (validationRes.error) return logger.error(validationRes.error.annotate());
    logger.debug(`Using ${blueBright(parse(path).base)} as config`);
    const urls = args.urls?.split(/,| ,/g).filter(Boolean);
    let scraper = new Scraper({
        ...config.scraper,
        ...(urls && urls?.length > 0 && { urls }),
        ...(typeof args.interval !== "undefined" && { port: args.interval }),
    });
    let exporter = new Exporter({
        ...config.exporter,
        scraper,
        ...(typeof args.port !== "undefined" && { port: args.port }),
    });
    bindLogs(logger, scraper, exporter);
    const bfS = async (code: any) => {
        rl.cursorTo(process.stdout, 0);
        rl.clearLine(process.stdout, 10);
        exporter.stop();
        await scraper.stop();
        process.exit(code);
    };
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
    await scraper.start();
    exporter.start();
    const stdin = process.stdin.isPaused() ? process.stdin.resume() : process.stdin;
    stdin.setRawMode && !stdin.isRaw && stdin.setRawMode(true);
    stdin.on("data", async (e) => {
        switch (e.readInt8(0)) {
            case 0x03: // Ctrl-C
            case 0x71: // Q
                return bfS(1);
            case 0x68: // H
            case 0x3f: // Question Mark
                console.log(
                    `Press ${blueBright("R")} to restart \nPress ${blueBright("Q")} or ${blueBright(
                        "Ctrl-C"
                    )} to exit\nPress ${blueBright("C")} to clear the console`
                );
                break;
            case 0x72:
                ac.abort();
                stdin.removeAllListeners();
                process.removeAllListeners();
                delete require.cache[path];
                logger.log("DEBUG", dim, [`Reloading ${blueBright(parse(path).base)}`]);
                exporter.stop();
                await scraper.stop();
                handler({ ...args, config: path });
                break;
            case 0x63:
                console.clear();
        }
    });
    beforeShutdown(bfS);
    try {
        let lastEvent = { file: "", now: 0 };
        for await (const _ of configWatcher) {
            if (lastEvent.file === _.filename && Date.now() - lastEvent.now < 5000) continue;
            lastEvent = { file: _.filename, now: Date.now() };
            logger.warn(
                `Your config file ${bold(
                    underline(parse(path).base)
                )} has changed, please restart (Press ${blueBright(
                    "R"
                )}) if you want to apply your changes`
            );
        }
    } catch {}
};
