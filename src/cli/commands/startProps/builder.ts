import Yargs from "yargs";
export const builder = (yargs: typeof Yargs) =>
    yargs
        .option("config", {
            alias: "c",
            type: "string",
            description: "Config file path",
        })
        .option("verbose", {
            alias: ["v", "debug"],
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
        .option("depth", {
            alias: "d",
            type: "number",
            description: "Number of subdirs to be searched in for the config",
        })
        .option("nocolor", {
            alias: ["nc", "nocolors"],
            type: "boolean",
            description: "Whether to print debug logs with colors or not",
        })
        .option("disable-keybindings", {
            type: "boolean",
            alias: ["dsk"],
            description: "Whether to disable the console's keybindings or not",
        })
        .option("watch-memory-leaks", {
            type: "boolean",
            alias: ["watchML"],
            description: "Whether to watch for memory leaks or not",
        });
