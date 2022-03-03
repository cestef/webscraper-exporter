import { blueBright, bold, dim, redBright, whiteBright, yellow } from "colorette";
import { escapeColors } from "./escapeColors";
export class Logger {
    constructor(
        private printTime: boolean,
        public verbose: number,
        private noColors: boolean = false
    ) {}
    log(level: string, color: any, args: any[]) {
        args = !Array.isArray(args[0]) ? args : args[0];
        args = args.map((e) => e.toString());
        const levelStr = {
            color: bold(color(`[${level.toUpperCase()}]`)),
            normal: `[${level.toUpperCase()}]`,
        };
        const timeStr = {
            color: whiteBright(new Date().toLocaleTimeString()),
            normal: new Date().toLocaleTimeString(),
        };
        const blankLength =
            (process.stdout.columns as number) -
            (escapeColors(args[0]).length + timeStr.normal.length + levelStr.normal.length + 3);
        console.log(
            `${this.noColors ? levelStr.normal : levelStr.color} ${
                this.noColors ? escapeColors(args[0]) : args[0]
            } ${
                this.printTime
                    ? ` ${" ".repeat(blankLength > 0 ? blankLength : 0)}${
                          blankLength > 0 ? (this.noColors ? timeStr.normal : timeStr.color) : ""
                      }`
                    : ""
            }`,
            ...args?.slice(1).map((e) => "\n" + e)
        );
    }
    debug(...args: any[]) {
        if (this.verbose >= 3) this.log("debug", dim, args);
    }
    warn(...args: any[]) {
        if (this.verbose >= 2) this.log("warn", yellow, args);
    }
    info(...args: any[]) {
        if (this.verbose >= 1) this.log("info", blueBright, args);
    }
    error(...args: any[]) {
        if (this.verbose >= 0) this.log("error", redBright, args);
    }
}
