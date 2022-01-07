import lighthouse from "lighthouse";
import { Browser } from "puppeteer";

export const lhReport = async (browser: Browser, url: string) => {
    const { lhr } = await lighthouse(url, {
        port: new URL(browser.wsEndpoint()).port,
        output: "json",
    });
    return lhr;
};
