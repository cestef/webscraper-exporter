#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as init from "./commands/init";
import * as start from "./commands/start";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

yargs(hideBin(process.argv))
    .scriptName("wsce")
    .version(
        "v" + JSON.parse(readFileSync(join(__dirname, "../..", "package.json"), "utf8")).version
    )
    .help()
    .alias("h", "help")
    .command(init as any)
    .command(start as any)
    .demandCommand()
    .detectLocale(false).argv;
