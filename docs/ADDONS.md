# Using addons

Addons are a way to customize the way `wsce` acts when testing. You can for example use them to add new conditions such as `Network Emulation`, `CPU Throttling` or even `Login Workflow` !

## Creating
To start creating your first addon, head to your `wsce.config.js`.

Addons are stored as Objects in an Array in the `scraper` field

```js
export default {
    scraper: {
        urls: [],
        puppeteerOptions: {},
        addons: [], // <--- Here 
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
There are 2 required properties in the `Addon` type:
- name `string`: _Unique name for this addon_
- run `function`: _Function taking browser, page and URL as his parameters that is ran when using the addon_

and 2 optional ones:
- twice `boolean`: _Whether to run the test with and without the addon _
- when: `string`: _When to run the addon in the test, can be either `after` or `before`_

### Writing a `run` Function

This function takes 3 arguments: 
- browser [`BrowserContext`](https://pptr.dev/#?product=Puppeteer&version=v13.0.1&show=api-class-browsercontext)
- page [`Page`](https://pptr.dev/#?product=Puppeteer&version=v13.0.1&show=api-class-page)
- URL `string`
- logger [`Logger`](https://docs.cstef.dev/docs/webscraper-exporter/interfaces/Logger)

#### Example

```js
{
    name: "Logger",
    when: "after",
    twice: false,
    run: (browser, page, URL, logger) => {
        logger.debug(`Test on ${URL} finished 🦄`)
    }
}
```

See the `examples` folder for more examples.