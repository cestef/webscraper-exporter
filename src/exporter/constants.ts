import { ScrapeResult } from "../scraper";

const labelNames = ["url", "addons"];
export const GAUGES = [
    {
        gauge: {
            name: "time_to_first_byte",
            help: "Time to first byte (TTFB)",
            labelNames,
        },
        getProperty: (res: ScrapeResult) => res.ttfb,
    },
    {
        gauge: {
            name: "duration",
            help: "Duration of the test (ms)",
            labelNames,
        },
        getProperty: (res: ScrapeResult) => res.duration,
    },
    {
        gauge: {
            name: "heap_usage",
            help: "JS Heap used size (bytes)",
            labelNames,
        },
        getProperty: (res: ScrapeResult) => res.memoryMetrics.JSHeapUsedSize,
    },
    {
        gauge: {
            name: "cpu_usage",
            help: "Average CPU usage (%)",
            labelNames,
        },
        getProperty: (res: ScrapeResult) => res.cpuMetrics.average,
    },
    {
        gauge: {
            name: "bytes_in",
            help: "Bytes in",
            labelNames,
        },
        getProperty: (res: ScrapeResult) => res.bytesIn,
    },
];
