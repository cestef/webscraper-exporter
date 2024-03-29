# Webscraper Exporter
<p align="center">
  <img src="https://user-images.githubusercontent.com/53212129/168236403-3a8cc17f-3f1f-4d94-86b9-44bbe1b41a44.png" style="height:70%; width:70%;margin-bottom:20px;margin-top:20px;">
</p>

A simple yet powerful [`prometheus`](https://prometheus.io) exporter for website performance metrics built using [`puppeteer`](https://pptr.dev/).

## Table of contents 

- [Webscraper Exporter](#webscraper-exporter)
  - [Table of contents](#table-of-contents)
  - [CLI](#cli)
    - [Getting started](#getting-started)
      - [Installation of the CLI](#installation-of-the-cli)
      - [Configuration](#configuration)
      - [Using the CLI](#using-the-cli)
        - [Starting](#starting)
        - [Creating a project](#creating-a-project)
        - [Adding, Removing and Listing Templates](#adding-removing-and-listing-templates)
  - [NodeJS module](#nodejs-module)
      - [Installation of the module](#installation-of-the-module)
      - [Using the module](#using-the-module)
  - [Docker](#docker)
  - [Exported Data](#exported-data)
  - [Customization](#customization)
  - [Contributing](#contributing)

## CLI 

Currently only tested on `macOS` and `Linux`, should support `Windows`

### Getting started

#### Installation of the CLI

<img src="./docs/media/wsce-install.gif" style="height:50%; width:50%;margin-bottom:20px;margin-top:20px">

You can install the cli included to get started quickly with barely no configuration:

```bash
npm install --global webscraper-exporter 
```

or 

```bash
yarn global add webscraper-exporter
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
        interval: 60_000,
    },
    exporter: {
        port: 9924
    },
};
```

For further information on the configuration, see [CONFIGURING.md](docs/CONFIGURING.md)

#### Using the CLI

To see all available options for a command, see `wsce <command> -h`;

##### Starting
You can start the exporter by simply executing:

```
wsce start
```

You can then access the metrics at http://localhost:9924

If you want more detailled logs, you can pass the `-v` argument.

To pass a custom config file, use `-c path/to/file`

##### Creating a project

Create a project from one of the included templates by running:

```
wsce init my-project 
```

You will then be prompted for the project template. You can also directly pass the template to `wsce init`, e.g. : 

```
wsce init my-project --template javascript
```

By default, `wsce` includes a typings file for the config so it's easier to fill. If you don't want that, you can pass `--typings=false` to the `init` command.

##### Adding, Removing and Listing Templates

`wsce template` has 3 subcommands:

- `add`: Add a template from a local directory / remote repository
- `remove`: Remove a saved template
- `list`: List all saved templates

For more information on templates, see [TEMPLATES.md](docs/TEMPLATES.md)

## NodeJS module

#### Installation of the module

```
npm install --save webscraper-exporter 
```

or 

```
yarn add webscraper-exporter
```

#### Using the module

```js
import { Exporter, Scraper } from "webscraper-exporter";

const scraper = new Scraper({
    urls: ["https://cstef.dev"],
    addons: [
        {
            name: "Logger",
            when: "before",
            run: (browser, page, URL) => {
                console.log(`I am running on ${URL}`);
            },
        },
    ],
    interval: 60_000,
});
scraper.start();
const exporter = new Exporter({ 
    scraper, 
    port: 9924, 
});
exporter.start();
```

For more examples, see the `examples` folder.

## Docker

There is a [`Dockerfile`](Dockerfile) included in this repository so you can build your own image for `wsce` (based on the `node:alpine-16` image).

See [DOCKER.md](docs/DOCKER.md) for more information.

## Exported Data

You can see the metrics that are exposed in: [EXPORTED_DATA.md](docs/EXPORTED_DATA.md)

## Customization

You can easily write your own plugins in Javascript to expand `webscraper-exporter`'s functionalities. 

See [ADDONS.md](docs/ADDONS.md) for more information.

## Contributing

Pull requests are always welcome if you feel like fixing / expanding something in this project !