import Yargs from "yargs";

export const builder = (yargs: typeof Yargs) =>
    yargs.positional("command", {
        describe: "The command to execute",
        type: "string",
        choices: ["add", "remove", "list"],
    });
