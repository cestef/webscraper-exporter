# Configuring

Most of the configuration part happens in the config file. (`wsce.config.js` by default)

Here is the default configuration file: 
```js
module.exports = {
    scraper: {
        urls: [],
        puppeteerOptions: {},
        addons: [],
        interval: 60_000,
    },
    exporter: {
        port: 9924,
    },
};
```

## `wsce.config.js`

- #### scraper
    - urls: `string[]` _The URLs to measure_
    - puppeteerOptions: [`PuppeteerOptions`](https://pptr.dev/#?product=Puppeteer&version=v13.0.1&show=api-puppeteerlaunchoptions) _Options object to pass to the puppeteer `launch` function_
    - addons: [`Addon[]`](https://docs.cstef.dev/docs/webscraper-exporter/interfaces/Addon) _see [ADDONS.md](./ADDONS.md)_
    - interval: `number` _The scraper's interval_
- #### exporter
    - port: `number` _The port for the exporter to listen on_
