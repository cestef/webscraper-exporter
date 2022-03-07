#!/usr/bin/env node

import { readFileSync } from "fs";
import { join } from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { bold } from "colorette";
import UpdateNotifier from "update-notifier";

const VERSION = JSON.parse(readFileSync(join(__dirname, "../..", "package.json"), "utf8")).version;
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
        .commandDir(join(__dirname, "./commands"))
        .demandCommand().argv;
})();
