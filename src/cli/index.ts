#!/usr/bin/env node

import { readFileSync } from "fs";
import { join } from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as init from "./commands/init";
import * as start from "./commands/start";
import * as template from "./commands/template";

yargs(hideBin(process.argv))
    .scriptName("wsce")
    .version(
        "v" + JSON.parse(readFileSync(join(__dirname, "../..", "package.json"), "utf8")).version
    )
    .help()
    .alias("h", "help")
    .command(init as any)
    .command(start as any)
    .command(template as any)
    .detectLocale(false)
    .demandCommand().argv;
