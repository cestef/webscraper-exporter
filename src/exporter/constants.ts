import { ScrapeResult } from "../scraper";

const labelNames = ["url", "addons"];
interface IGauge {
    gauge: {
        name: string;
        help: string;
        labelNames: string[];
    };
    getProperty: (res: ScrapeResult) => any;
}
export const GAUGES: IGauge[] = [
    {
        gauge: {
            name: "webscraper_time_to_first_byte_seconds",
            help: "Time to first byte (TTFB) in seconds",
            labelNames,
        },
        getProperty: (res) => res.ttfb / 1000,
    },
    {
        gauge: {
            name: "webscraper_test_duration_seconds",
            help: "Duration of the test in seconds",
            labelNames,
        },
        getProperty: (res) => res.duration / 1000,
    },
    {
        gauge: {
            name: "webscraper_heap_usage_bytes",
            help: "JS Heap used size in bytes",
            labelNames,
        },
        getProperty: (res) => res.memoryMetrics.JSHeapUsedSize,
    },
    {
        gauge: {
            name: "webscraper_cpu_usage_seconds",
            help: "Cumulative Active CPU usage (seconds)",
            labelNames,
        },
        getProperty: (res) => res.cpuMetrics.activeTime / 1000,
    },
    {
        gauge: {
            name: "webscraper_cpu_test_duration_seconds",
            help: "Duration of the test for the CPU in seconds",
            labelNames,
        },
        getProperty: (res) => res.cpuMetrics.duration / 1000,
    },
    {
        gauge: {
            name: "webscraper_in_bytes",
            help: "Bytes in",
            labelNames,
        },
        getProperty: (res) => res.bytesIn,
    },
];
