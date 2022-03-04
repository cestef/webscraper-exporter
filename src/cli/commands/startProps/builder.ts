import Yargs from "yargs";
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
