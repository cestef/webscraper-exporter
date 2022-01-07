import { gray, bold, Color, blueBright, whiteBright, yellow, redBright } from "colorette";
export default class Logger {
    constructor(private verbose: boolean) {}
    log(level: string, color: Color, ...args: any[]) {
        console.log(
            `${whiteBright(new Date().toLocaleTimeString())} ${bold(
                color(`[${level.toUpperCase()}]`)
            )}`,
            ...args
        );
    }
    debug(...args: any[]) {
        if (this.verbose) this.log("debug", gray, ...args);
    }
    info(...args: any[]) {
        this.log("info", blueBright, ...args);
    }
    warn(...args: any[]) {
        this.log("warn", yellow, ...args);
    }
    error(...args: any[]) {
        this.log("error", redBright, ...args);
    }
}
