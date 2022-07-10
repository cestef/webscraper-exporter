import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import client, { Gauge } from "prom-client";
import url from "url";
import { Scraper } from "../index";
import { TestResult } from "../scraper/types";
import { EventEmitter } from "events";
import { LogLevel } from "..";
import { ScrapeResult } from "../scraper";
import { GAUGES } from "./constants";
import { blueBright } from "colorette";
import { readFileSync } from "fs-extra";
import { join } from "path";

interface Exporter {
    on(event: "info", listener: (message: string) => void): this;
    on(event: "warn", listener: (message: string) => void): this;
    on(event: "error", listener: (message: string) => void): this;
    on(event: "debug", listener: (message: string) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
}
class Exporter extends EventEmitter {
    server: Server | null;
    register: client.Registry;
    scraper: Scraper;
    gauges: { getProperty: (res: ScrapeResult) => number; gauge: client.Gauge<string> }[];
    constructor(public options: ExporterOptions) {
        super();
        this.server = null;
        this.register = client.register;
        this.scraper = options.scraper;
        this.options.port = this.options.port || 9924;
        this.gauges = GAUGES.map(({ getProperty, gauge }) => ({
            getProperty,
            gauge: new Gauge(gauge),
        }));
    }
    private _emitLog(level: LogLevel, ...args: any[]) {
        switch (level) {
            case LogLevel.DEBUG:
                this.emit("debug", args);
                break;
            case LogLevel.WARN:
                this.emit("warn", args);
                break;
            case LogLevel.INFO:
                this.emit("info", args);
                break;
            case LogLevel.ERROR:
                this.emit("error", args);
                break;
        }
    }
    start() {
        this.server = createServer();
        this.server.listen(this.options.port);
        this._emitLog(
            LogLevel.INFO,
            `Exporter listening on ${blueBright(
                `http://localhost${this.options.port === 80 ? "" : `:${this.options.port}`}/metrics`
            )}`
        );
        this.server.on("request", this._get.bind(this));
        this.scraper.on("testsFinish", this._handleTestsFinish.bind(this));
        return this;
    }
    private async _handleTestsFinish(test: TestResult) {
        for (let URL in test) {
            let t = test[URL];
            for (let { test, addons } of t.scrape) {
                const labels = { url: URL, addons: addons.map((e) => e.name).join(",") };
                for (let { gauge, getProperty } of this.gauges)
                    gauge.set(labels, getProperty(test));
            }
        }
    }
    private async _get(req: IncomingMessage, res: ServerResponse) {
        const route = url.parse(req.url as string).pathname;
        switch (route) {
            case "/metrics": {
                res.setHeader("Content-Type", this.register.contentType);
                res.end(await this.register.metrics());
                break;
            }
            case "/": {
                res.setHeader("Content-Type", "text/html");
                res.end(
                    readFileSync(join(__dirname, "../../public/index.html"), { encoding: "utf8" })
                );
            }
        }
    }
    stop() {
        this._emitLog(LogLevel.DEBUG, "Stopping the exporter");
        this.server?.close();
        this.server = null;
        client.register.clear();
    }
}
export { Exporter };

export interface ExporterOptions {
    port: number;
    scraper: Scraper;
}
