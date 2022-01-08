import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import client, { Gauge, Registry } from "prom-client";
import url from "url";
import { Scraper } from "..";
import { TestResult } from "../scraper/types";
import Logger from "../Logger";

const bytesIn = new Gauge({
    name: "bytes_in",
    help: "Bytes In",
    labelNames: ["url", "conditions"],
});
const cpuUsage = new Gauge({
    name: "cpu_usage",
    help: "CPU Usage (%)",
    labelNames: ["url", "conditions"],
});
const heapUsage = new Gauge({
    name: "heap_usage",
    help: "Heap Usage (bytes)",
    labelNames: ["url", "conditions"],
});
const duration = new Gauge({
    name: "duration",
    help: "Test Duration (ms)",
    labelNames: ["url", "conditions"],
});

class Exporter {
    server: Server | null;
    register: client.Registry;
    scraper: Scraper;
    logger: Logger;
    constructor(private options: ExporterOptions) {
        this.server = null;
        this.register = client.register;
        this.scraper = options.scraper;
        this.logger = new Logger(options.verbose);
    }
    start() {
        this.server = createServer();
        this.server.listen(this.options.port);
        this.logger.info(
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
            for (let { scrape, conditions } of t.scrape) {
                bytesIn.set(
                    { url: URL, conditions: conditions.map((e) => e.name).join(",") },
                    scrape.bytesIn
                );
                cpuUsage.set(
                    { url: URL, conditions: conditions.map((e) => e.name).join(",") },
                    scrape.cpuMetrics.average
                );
                heapUsage.set(
                    { url: URL, conditions: conditions.map((e) => e.name).join(",") },
                    scrape.memoryMetrics.JSHeapUsedSize
                );
                duration.set(
                    { url: URL, conditions: conditions.map((e) => e.name).join(",") },
                    scrape.duration
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
        this.logger.debug("Stopping exporter...");
        this.server?.close();
        this.server = null;
        this.scraper.removeAllListeners();
    }
}
export { Exporter };

export interface ExporterOptions {
    verbose: boolean;
    port: number;
    scraper: Scraper;
}
