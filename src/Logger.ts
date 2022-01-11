import { gray, bold, blueBright, whiteBright, yellow, redBright, greenBright } from "colorette";
export default class Logger {
    constructor(private printTime: boolean, private verbose: number) {}
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
    info(...args: any[]) {
        if (this.verbose >= 2) this.log("info", blueBright, ...args);
    }
    warn(...args: any[]) {
        if (this.verbose >= 1) this.log("warn", yellow, ...args);
    }
    success(...args: any[]) {
        if (this.verbose >= 0) this.log("success", greenBright, ...args);
    }
    error(...args: any[]) {
        if (this.verbose >= 0) this.log("error", redBright, ...args);
    }
}
