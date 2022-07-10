import { Metrics, Page } from "puppeteer-core";

export interface MemoryStats {
    JSHeapUsedSize: number;
    LayoutCount: number;
    RecalcStyleCount: number;
    JSEventListeners: number;
    Nodes: number;
    ScriptDuration: number;
    TaskDuration: number;
    Timestamp: number;
    LayoutDuration: number;
    RecalcStyleDuration: number;
}

export const getMemory = async (page: Page): Promise<MemoryStats> => {
    const client = page.client?.();
    await client.send(`HeapProfiler.enable`);
    await client.send(`HeapProfiler.collectGarbage`);
    const metrics = await page.metrics();
    await client.send(`HeapProfiler.disable`);
    const measures = (
        [
            `JSHeapUsedSize`,
            `LayoutCount`,
            `RecalcStyleCount`,
            `JSEventListeners`,
            `Nodes`,
            `ScriptDuration`,
            `TaskDuration`,
            `Timestamp`,
            `LayoutDuration`,
            `RecalcStyleDuration`,
        ] as (keyof Metrics)[]
    ).reduce(
        (accumulator, metric) => ({
            ...accumulator,
            [metric]: metrics[metric],
        }),
        {}
    );

    return measures as any;
};
