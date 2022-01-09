# Configuring

Most of the configuration part happens in the config file. (`wsce.config.js` by default)

Here is the default configuration file: 
```js
module.exports = {
    scraper: {
        urls: [],
        puppeteerOptions: {},
        conditions: [],
        lighthouse: false,
        interval: 60_000,
        verbose: false,
    },
    exporter: {
        port: 3000,
        verbose: false,
    },
};
```

## `wsce.config.js`

- #### scraper
    - urls: `string[]` _The URLs to measure_
    - puppeteerOptions: [`PuppeteerOptions`](https://pptr.dev/#?product=Puppeteer&version=v13.0.1&show=api-puppeteerlaunchoptions) _Options object to pass to the puppeteer `launch` function_
    - conditions: `Condition[]` _see [CONDITONS.md](./CONDITIONS.md)_
    - lighthouse: `boolean` _Whether to generate or not a lighthouse report_
    - interval: `number` _The scraper's interval_
    - verbose: `boolean` Whether to print detailled logs or not
- #### exporter
    - port: `number` _The port for the exporter to listen on_
    - verbose: `boolean` Whether to print detailled logs or not
