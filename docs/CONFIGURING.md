# Configuring

Most of the configuration part happens in the config file. (`wsce.config.js` by default)

Here is the default configuration file: 
```js
module.exports = {
    scraper: {
        urls: [],
        puppeteerOptions: {},
        addons: [],
        lighthouse: false,
        interval: 60_000,
        verbose: 0,
    },
    exporter: {
        port: 3000,
        verbose: 0,
    },
};
```

## `wsce.config.js`

- #### scraper
    - urls: `string[]` _The URLs to measure_
    - puppeteerOptions: [`PuppeteerOptions`](https://pptr.dev/#?product=Puppeteer&version=v13.0.1&show=api-puppeteerlaunchoptions) _Options object to pass to the puppeteer `launch` function_
    - addons: `Addon[]` _see [ADDONS.md](./ADDONS.md)_
    - lighthouse: `boolean` _Whether to generate or not a lighthouse report_
    - interval: `number` _The scraper's interval_
    - verbose: `number` _The log level for the scraper_
- #### exporter
    - port: `number` _The port for the exporter to listen on_
    - verbose: `number` _The log level for the exporter_
