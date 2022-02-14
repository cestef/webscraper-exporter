import { nanoid } from "nanoid";
import type { BrowserContext, Page } from "puppeteer";
import { ScrapeResult } from "../scraper";

export default class Addon {
    name: string;
    when: WhenToRun;
    run: RunFunction<WhenToRun>;
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
    setWhen(when: WhenToRun) {
        this.when = when;
        return this;
    }
    setTwice(twice: boolean) {
        this.twice = twice;
        return this;
    }
    setRun(run: RunFunction<WhenToRun>) {
        this.run = run;
        return this;
    }
}

export type WhenToRun = "before" | "after";
export type RunFunction<T extends WhenToRun> = T extends "before"
    ? (browser: BrowserContext, page: Page, URL: string) => Promise<any> | any
    : (
          browser: BrowserContext,
          page: Page,
          URL: string,
          result: ScrapeResult
      ) => Promise<any> | any;

export interface IAddon<T extends WhenToRun = WhenToRun> {
    /**
     * Unique name for this addon
     */
    name: string;
    /**
     * Whether the test should be ran with and without this addon
     * @default false
     */
    twice?: boolean;
    /**
     * When to run the addon
     * @default "before"
     */
    when?: T;

    run: RunFunction<T>;
}
