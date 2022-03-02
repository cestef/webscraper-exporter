import { blueBright, bold, gray, redBright, whiteBright, yellow } from "colorette";
export class Logger {
    constructor(
        private printTime: boolean,
        public verbose: number,
        private noColors: boolean = false
    ) {}
    log(level: string, color: any, args: any[]) {
        args = !Array.isArray(args[0]) ? args : args[0];
        args = args.map((e) => e.toString());
        const levelStr = this.noColors
            ? `[${level.toUpperCase()}]`
            : bold(color(`[${level.toUpperCase()}]`));
        const time = this.printTime
            ? this.noColors
                ? new Date().toLocaleTimeString()
                : whiteBright(new Date().toLocaleTimeString())
            : "";
        const blankLength =
            (process.stdout.columns as number) -
            time.length -
            levelStr.length -
            (args[0]?.length || 0);
        console.log(
            `${levelStr} ${args[0]}${" ".repeat(blankLength > 0 ? blankLength : 0)}${
                blankLength > 0 ? time : ""
            }`,
            ...args?.slice(1).map((e) => "\n" + e)
        );
    }
    debug(...args: any[]) {
        if (this.verbose >= 3) this.log("debug", gray, args);
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
