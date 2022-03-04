import { whiteBright, bold, underline, blueBright } from "colorette";
import { join, parse } from "path";
import { ExporterOptions } from "../../../exporter";
import { ScraperOptions } from "../../../scraper";
import { findConfig, Logger, loadConfig as load } from "../../../utils";
import { prompt } from "inquirer";
import shorten from "path-shorten";

export const fullyLoadConfig = async (args: any, logger: Logger) => {
    let config: { scraper: ScraperOptions; exporter: ExporterOptions } | null = null;
    let path: string = "";
    const loadDefault = async () => {
        logger.warn("Falling back to default config.");
        const defaultPath = join(__dirname, "../../../..", "config", "default.wsce.config.js");
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
    return { config, path };
};

export const watchForConfigChange = async (watcher: any, logger: Logger) => {
    try {
        let lastEvent = { file: "", now: 0 };
        for await (const _ of watcher) {
            if (lastEvent.file === _.filename && Date.now() - lastEvent.now < 5000) continue;
            lastEvent = { file: _.filename, now: Date.now() };
            logger.warn(
                `Your config file ${bold(
                    underline(_.filename)
                )} has changed, please restart (Press ${blueBright(
                    "R"
                )}) if you want to apply your changes`
            );
        }
    } catch {}
};
export const handleStdin = async (keybindings: {
    [key: number]: number | (() => void | Promise<void>);
}) => {
    const stdin = process.stdin.isPaused() ? process.stdin.resume() : process.stdin;
    stdin.setRawMode && !stdin.isRaw && stdin.setRawMode(true);
    const handleInput = (input: number) => {
        const keybind = keybindings[input];

        if (keybind) {
            if (typeof keybind === "number" && typeof keybindings[keybind] === "number") {
                handleInput(keybindings[keybind] as number);
            } else if (typeof keybind === "number" && typeof keybindings[keybind] === "function") {
                (keybindings[keybind] as any)();
            } else if (typeof keybind === "function") {
                keybind();
            }
        }
    };
    stdin.on("data", (input) => handleInput(input.readInt8(0)));
};
