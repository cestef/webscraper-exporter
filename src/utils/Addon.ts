import { nanoid } from "nanoid";
import type { BrowserContext, Page } from "puppeteer";
import type { IAddon } from "../scraper/types";

export default class Addon implements IAddon {
    name: string;
    when: "before" | "after";
    run: (browser: BrowserContext, page: Page, URL: string) => Promise<any> | any;
    twice: boolean;
    constructor(options?: IAddon) {
        this.name = options?.name || nanoid();
        this.when = options?.when || "before";
        this.run = options?.run || (() => console.log('Addon does not have a "run" property'));
        this.twice = options?.twice || false;
    }
    setName(name: string) {
        this.name = name;
        return this;
    }
    setWhen(when: "before" | "after") {
        this.when = when;
        return this;
    }
    setTwice(twice: boolean) {
        this.twice = twice;
        return this;
    }
    setRun(run: (browser: BrowserContext, page: Page, URL: string) => Promise<any> | any) {
        this.run = run;
        return this;
    }
}
