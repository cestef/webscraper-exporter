import { table } from "table";
import ms from "ms";
import bytes from "bytes";
import type { TestResult } from "../types";

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(() => r(), ms));
export const printResults = (results: TestResult) => {
    const scrapeCategories = [
        "URL",
        "Conditions",
        "CPU Usage",
        "Heap Usage",
        "Duration",
        "Bytes In",
    ];
    const lhrCategories = ["URL", "Performance", "Accessibility", "Best Practices", "SEO", "PWA"];
    // if (scraper.lighthouse) {
    //     console.log(
    //         "Lighthouse results: \n" +
    //             table([
    //                 lhrCategories,
    //                 ...Object.keys(results).map((e) => {
    //                     const res = results[e];
    //                     return [
    //                         e,
    //                         res.lhr.categories.performance.score * 100,
    //                         res.lhr.categories.accessibility.score * 100,
    //                         res.lhr.categories["best-practices"].score * 100,
    //                         res.lhr.categories.seo.score * 100,
    //                         res.lhr.categories.pwa.score * 100,
    //                     ];
    //                 }),
    //             ]) +
    //             "\n"
    //     );
    // }
    const scrapeResults = ([] as string[][]).concat(
        ...Object.keys(results).map((e) => [
            ...results[e].scrape.map((r) => [
                `${e}`,
                r.conditions
                    .map((e) => e.name)
                    .filter(Boolean)
                    .join(", ") || "Normal Conditions",
                r.scrape.cpuMetrics.average.toFixed(3) + "%",
                bytes(r.scrape.memoryMetrics.JSHeapUsedSize),
                ms(r.scrape.duration),
                bytes(r.scrape.bytesIn),
            ]),
        ])
    );
    console.log("Testing results: \n" + table([scrapeCategories, ...scrapeResults]));
};
export const getCombinations = <ArrayType = any>(valuesArray: ArrayType[]): ArrayType[][] => {
    let combi = [];
    let temp = [];
    let slent = Math.pow(2, valuesArray.length);

    for (let i = 0; i < slent; i++) {
        temp = [];
        for (let j = 0; j < valuesArray.length; j++) {
            if (i & Math.pow(2, j)) {
                temp.push(valuesArray[j]);
            }
        }
        if (temp.length > 0) {
            combi.push(temp);
        }
    }

    return combi;
};
