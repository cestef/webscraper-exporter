#!/usr/bin/env node

import isInstalledGlobally from "is-installed-globally";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import Logger from "../Logger.js";
import * as init from "./commands/init.js";
import * as start from "./commands/start.js";
yargs(hideBin(process.argv))
    .help()
    .alias("h", "help")
    .command(init as any)
    .command(start as any)
    .demandCommand()
    .detectLocale(false)
    .parseAsync()
    .then((args) => {
        const logger = new Logger(true, args.v as number);
        if (!isInstalledGlobally) logger.debug(`Running on local installation`);
    });
