import { blueBright, bold, gray, greenBright, redBright, whiteBright, yellow } from "colorette";
export default class Logger {
    constructor(private printTime: boolean, public verbose: number) {}
    log(level: string, color: any, ...args: any[]) {
        console.log(
            `${this.printTime ? whiteBright(new Date().toLocaleTimeString()) + " " : ""}${bold(
                color(`[${level.toUpperCase()}]`)
            )}`,
            ...args
        );
    }
    debug(...args: any[]) {
        if (this.verbose >= 3) this.log("debug", gray, ...args);
    }
    warn(...args: any[]) {
        if (this.verbose >= 2) this.log("warn", yellow, ...args);
    }
    info(...args: any[]) {
        if (this.verbose >= 1) this.log("info", blueBright, ...args);
    }
    error(...args: any[]) {
        if (this.verbose >= 0) this.log("error", redBright, ...args);
    }
}
