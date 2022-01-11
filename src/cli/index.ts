#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

yargs(hideBin(process.argv))
    .help()
    .alias("h", "help")
    .commandDir("commands")
    .demandCommand()
    .detectLocale(false).argv;
