// Slowdown 2x

const factor = 2;

const CPUThrottling = {
    name: "CPU Throttling",
    when: "before",
    twice: false,
    run: async (_, page, __) => {
        await page.emulateCPUThrottling(factor);
    },
};
module.exports = CPUThrottling;
