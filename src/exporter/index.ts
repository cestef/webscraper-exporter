import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import client, { Gauge } from "prom-client";
import url from "url";
import { Scraper } from "../index";
import { TestResult } from "../scraper/types";
import { EventEmitter } from "events";
import { LogLevel } from "..";

const bytesIn = new Gauge({
    name: "bytes_in",
    help: "Bytes In",
    labelNames: ["url", "addons"],
});
const cpuUsage = new Gauge({
    name: "cpu_usage",
    help: "CPU Usage (%)",
    labelNames: ["url", "addons"],
});
const heapUsage = new Gauge({
    name: "heap_usage",
    help: "Heap Usage (bytes)",
    labelNames: ["url", "addons"],
});
const duration = new Gauge({
    name: "duration",
    help: "Duration of the Test (ms)",
    labelNames: ["url", "addons"],
});
const lhrPerf = new Gauge({
    name: "lhr_performance_score",
    help: "LighHouse Performance Score",
    labelNames: ["url"],
});
const lhrAccess = new Gauge({
    name: "lhr_accessibility_score",
    help: "LighHouse Accessibility Score",
    labelNames: ["url"],
});
const lhrBP = new Gauge({
    name: "lhr_best_practices_score",
    help: "LighHouse Best Practices Score",
    labelNames: ["url"],
});
const lhrSEO = new Gauge({
    name: "lhr_seo_score",
    help: "LighHouse SEO Score",
    labelNames: ["url"],
});
const lhrPWA = new Gauge({
    name: "lhr_pwa_score",
    help: "LighHouse PWA Score",
    labelNames: ["url"],
});
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
    constructor(private options: ExporterOptions) {
        super();
        this.server = null;
        this.register = client.register;
        this.scraper = options.scraper;
        this.options.port = this.options.port || 3000;
    }
    private _emitLog(level: LogLevel, ...args: any[]) {
        switch (level) {
            case LogLevel.DEBUG:
                this.emit("debug", args.join("\n"));
                break;
            case LogLevel.WARN:
                this.emit("warn", args.join("\n"));
                break;
            case LogLevel.INFO:
                this.emit("info", args.join("\n"));
                break;
            case LogLevel.ERROR:
                this.emit("error", args.join("\n"));
                break;
        }
    }
    start() {
        this.server = createServer();
        this.server.listen(this.options.port);
        this._emitLog(
            LogLevel.INFO,
            `Exporter listening on http://localhost${
                this.options.port === 80 ? "" : `:${this.options.port}`
            }/metrics`
        );
        this.server.on("request", this._get.bind(this));
        this.scraper.on("testsFinish", this._handleTestsFinish.bind(this));
    }
    private async _handleTestsFinish(test: TestResult) {
        for (let URL in test) {
            let t = test[URL];
            if (t.lhr) {
                lhrPerf.set({ url: URL }, t.lhr.categories.performance.score);
                lhrAccess.set({ url: URL }, t.lhr.categories.accessibility.score);
                lhrBP.set({ url: URL }, t.lhr.categories["best-practices"].score);
                lhrSEO.set({ url: URL }, t.lhr.categories.seo.score);
                lhrPWA.set({ url: URL }, t.lhr.categories.pwa.score);
            }
            for (let { test, addons } of t.scrape) {
                bytesIn.set(
                    { url: URL, addons: addons.map((e) => e.name).join(",") },
                    test.bytesIn
                );
                cpuUsage.set(
                    { url: URL, addons: addons.map((e) => e.name).join(",") },
                    test.cpuMetrics.average
                );
                heapUsage.set(
                    { url: URL, addons: addons.map((e) => e.name).join(",") },
                    test.memoryMetrics.JSHeapUsedSize
                );
                duration.set(
                    { url: URL, addons: addons.map((e) => e.name).join(",") },
                    test.duration
                );
            }
        }
    }
    private async _get(req: IncomingMessage, res: ServerResponse) {
        const route = url.parse(req.url as string).pathname;
        if (route === "/metrics") {
            res.setHeader("Content-Type", this.register.contentType);
            res.end(await this.register.metrics());
        }
    }
    stop() {
        this._emitLog(LogLevel.DEBUG, "Stopping exporter...");
        this.server?.close();
        this.server = null;
        this.scraper.removeAllListeners();
    }
}
export { Exporter };

export interface ExporterOptions {
    port: number;
    scraper: Scraper;
}
