import { Logger, beforeShutdown, bindLogs, portInUse, unbindLogs } from "../../../utils";
import { blueBright, bold, dim, underline } from "colorette";
import { fullyLoadConfig, handleStdin, watchForConfigChange } from "./functions";

import { AbortController } from "node-abort-controller";
import { Exporter } from "../../../exporter";
import { Scraper } from "../../../scraper";
import { parse } from "path";
import { prompt } from "inquirer";
import rl from "readline";
import { validateConfig } from "../../schema";
import { watch } from "fs/promises";

export const handler = async (args: any) => {
    const logger = new Logger(true, args.v ? 3 : 2, args.nocolor);
    const { path, config } = await fullyLoadConfig(args, logger);
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
        rl.clearLine(process.stdout, 0);
        exporter.stop();
        await scraper.stop();
        unbindLogs(scraper, exporter);
        process.exit(code);
    };
    while (await portInUse(exporter.options.port)) {
        const { useNewPort } = await prompt({
            name: "useNewPort",
            message: `The port ${exporter.options.port} is already in use, do you want to use another port ?`,
            type: "confirm",
        });
        if (useNewPort) {
            exporter.options.port++;
        } else return process.exit(1);
    }
    await scraper.start();
    exporter.start();
    if (!args.dsk) {
        handleStdin({
            0x03: 0x71,
            0x71: () => bfS(1),
            0x68: 0x3f,
            0x3f: () =>
                console.log(
                    `${underline(bold("Keybindings"))}\nPress ${blueBright(
                        "R"
                    )} to restart \nPress ${blueBright("Q")} or ${blueBright(
                        "Ctrl-C"
                    )} to exit\nPress ${blueBright("C")} to clear the console`
                ),
            0x72: async () => {
                ac.abort();
                process.stdin.removeAllListeners();
                process.removeAllListeners();
                delete require.cache[path];
                logger.log("DEBUG", dim, [`Reloading ${blueBright(parse(path).base)}`]);
                exporter.stop();
                await scraper.stop();
                unbindLogs(scraper, exporter);
                handler({ ...args, config: path });
            },
            0x63: () => console.clear(),
        });
    }

    beforeShutdown(bfS);
    watchForConfigChange(configWatcher, logger);
};
