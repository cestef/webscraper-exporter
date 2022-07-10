#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { bold } from "colorette";
import UpdateNotifier from "update-notifier";
const PACKAGE_PATH = join(__dirname, "../..", "package.json");
const VERSION = existsSync(PACKAGE_PATH)
    ? JSON.parse(readFileSync(PACKAGE_PATH, "utf8")).version
    : "0.0.0";

import * as start from "./commands/start";
import * as init from "./commands/init";
import * as template from "./commands/template";
(async () => {
    const notifier = UpdateNotifier({
        pkg: {
            name: "webscraper-exporter",
            version: VERSION,
        },
        updateCheckInterval: 1,
    });
    notifier.notify({ isGlobal: true });
    yargs(hideBin(process.argv))
        .scriptName("wsce")
        .version("v" + VERSION)
        .alias("V", "version")
        .help("h", "Show the help page")
        .alias("h", "help")
        .epilog(bold(__dirname))
        .detectLocale(false)
        .command(start)
        .command(init)
        .command(template)
        .demandCommand().argv;
})();
