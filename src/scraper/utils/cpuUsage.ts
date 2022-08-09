import { CDPSession, Protocol } from "puppeteer-core";

interface CPUUsageSnapshot {
    timestamp: number;
    usage: number;
}

export interface CPUStats {
    // average: number;
    snapshots: CPUUsageSnapshot[];
    activeTime: number;
    duration: number;
}

const processMetrics = (
    metrics: Protocol.Performance.GetMetricsResponse
): {
    timestamp: number;
    activeTime: number;
} => {
    const activeTime = metrics.metrics
        .filter((m) => m.name.includes("Duration"))
        .map((m) => m.value)
        .reduce((a, b) => a + b);
    return {
        timestamp: metrics.metrics.find((m) => m.name === "Timestamp")?.value || 0,
        activeTime,
    };
};

export const getCPU = async (cdp: CDPSession, interval: number): Promise<() => CPUStats> => {
    await cdp.send("Performance.enable", {
        timeDomain: "timeTicks",
    });

    const { timestamp: startTime, activeTime: initialActiveTime } = processMetrics(
        await cdp.send("Performance.getMetrics")
    );
    const snapshots: CPUUsageSnapshot[] = [];
    let cumulativeActiveTime = initialActiveTime;

    let lastTimestamp = startTime;
    const timer = setInterval(async () => {
        const { timestamp, activeTime } = processMetrics(await cdp.send("Performance.getMetrics"));
        const frameDuration = timestamp - lastTimestamp;
        let usage = (activeTime - cumulativeActiveTime) / frameDuration;
        cumulativeActiveTime = activeTime;

        if (usage > 1) usage = 1;
        snapshots.push({
            timestamp,
            usage,
        });

        lastTimestamp = timestamp;
    }, interval);

    return () => {
        cdp.send("Performance.disable");
        clearInterval(timer);
        return {
            // average: cumulativeActiveTime / (lastTimestamp - startTime),
            activeTime: cumulativeActiveTime,
            duration: lastTimestamp - startTime,
            snapshots,
        };
    };
};
