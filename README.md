# Webscraper Exporter

A simple [`prometheus`](https://prometheus.io) exporter for website performance metrics.

## CLI 

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

In your current working directory, create a file named `wsce.config.js` with the following content:

```js
module.exports = {
    scraper: {
        urls: ["https://google.com"],
        puppeteerOptions: { headless: true },
        conditions: [],
        lighthouse: false,
        interval: 60_000,
    },
    exporter: {
        port: 3000
    },
};
```

#### Using

You can start the exporter by simply executing:

```
wsce
```

By default, if no port is provided, the exporter will listen on port `3000`

If you want more detailled logs, you can pass the `-v` argument.

To pass a custom config file, use `-c path/to/file`

### NodeJS module

#### Installing

```bash
npm install --save webscraper-exporter 
```

or 

```bash
yarn add webscraper-exporter
```