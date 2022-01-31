declare module "webscraper-exporter" {
    interface ScraperOptions {
        urls: string[];
        puppeteerOptions?: LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions;
        addons: Addon[];
        /**
         * The interval in ms to run the scraper.
         * @default 60000
         */
        interval?: number;
    }
    interface Addon {
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
        when?: "before" | "after";
        run: (browser: BrowserContext, page: Page, URL: string) => Promise<any> | any;
    }
    interface ExporterOptions {
        port: number;
    }
    interface WsceConfig {
        scraper: ScraperOptions;
        exporter: ExporterOptions;
    }
}
