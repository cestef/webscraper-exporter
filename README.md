# Webscraper Exporter

A simple yet powerful [`prometheus`](https://prometheus.io) exporter for website performance metrics built using [`puppeteer`](https://pptr.dev/.

## CLI 

Currently only tested on `macOS` and `Linux`, should support `Windows`

### Getting started

#### Installation

You can install the cli included to get started quickly with barely no configuration:

```bash
npm install --global webscraper-exporter 
```

or 

```bash
yarn add --global webscraper-exporter
```

You can then check if everything went OK by running:
```bash
wsce --version
```
This should print the package's version

#### Configuration

In your current working directory, create a file named `wsce.config.js` with the following example content:

```js
module.exports = {
    scraper: {
        urls: ["https://google.com"],
        puppeteerOptions: {},
        addons: [],
        lighthouse: false,
        interval: 60_000,
    },
    exporter: {
        port: 3000
    },
};
```

For further information on the configuration, see [CONFIGURING.md](./docs/CONFIGURING.md)

#### Using

You can start the exporter by simply executing:

```
wsce
```

By default, if no port is provided, the exporter will listen on port `3000`

If you want more detailled logs, you can pass the `-v` argument.

To pass a custom config file, use `-c path/to/file`

To see all available options for a command, see `wsce <command> -h`;

### NodeJS module

#### Installing

```bash
npm install --save webscraper-exporter 
```

or 

```bash
yarn add webscraper-exporter
```

#### Using
```js
import { Exporter, Scraper } from "webscraper-exporter";

const scraper = new Scraper({
    urls: ["https://cstef.dev"],
    addons: [
        {
            name: "Logger",
            when: "before",
            run: (browser, page, URL, logger) => {
                console.log(`I am running on ${URL}`);
            },
        },
    ],
    lighthouse: false,
    verbose: 3,
    interval: 60_000,
});
scraper.start();
const exporter = new Exporter({ 
    scraper, 
    port: 3000, 
    verbose: 3 
});
exporter.start();
```
For more examples, see the `examples` folder.
