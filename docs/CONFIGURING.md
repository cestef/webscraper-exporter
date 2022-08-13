# Configuring

Most of the configuration part happens in the config file. (`wsce.config.js` by default)

Here is the default configuration file: 
```js
// wsce.config.js

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
    - addons: `Addon[]` _see [ADDONS.md](./ADDONS.md)_
    - interval: `number` _The scraper's interval_
    - forceRecreateBrowser: `boolean` _Force the browser recreation for each test_
    - concurrentTests: `number` _Maximum tests to be ran at the same time_

    :warning: If `forceRecreateBrowser` is set to true, this will automatically be set to 1

    - queueThreshold: `number` _Maximum tests queue size, the program will exit when the queue exceeds this size_,
- #### exporter
    - port: `number` _The port for the exporter to listen on_
