# Using addons

Addons are a way to customize the way `wsce` acts when testing. You can for example use them to add new conditions such as `Network Emulation`, `CPU Throttling` or even `Login Workflow` !

## Creating
To start creating your first addon, head to your `wsce.config.js`.

Addons are stored as Objects in an Array in the `scraper` field

```js
// wsce.config.js

module.exports =  {
    scraper: {
        urls: [],
        puppeteerOptions: {},
        addons: [], // <--- Here 
        interval: 60_000,
    },
    exporter: {
        port: 9924,
    },
};
```
There are 2 required properties in the `Addon` type:
- name `string`: _Unique name for this addon_
- run `function`: _Function taking `browser`, `page` and `URL`, and `result` as his parameters that is ran when using the addon, see [Writing a `run` function](#writing-a-run-function)_

and 2 optional ones:
- twice `boolean`: _Whether to run the test with and without the addon_
- when: `string`: _When to run the addon in the test, can be either `after` or `before`_

### Writing a `run` Function

This function takes 4 arguments: 
- browser [`BrowserContext`](https://pptr.dev/#?product=Puppeteer&version=v13.0.1&show=api-class-browsercontext)
- page [`Page`](https://pptr.dev/#?product=Puppeteer&version=v13.0.1&show=api-class-page)
- URL `string`
- testResult `TestResult[keyof TestResult]`
    - :warning: This parameter is only passed when `when` is set to `after`


#### Examples

##### Log test results
```js
{
    name: "Logger",
    when: "after",
    twice: false,
    run: (browser, page, URL, res) => {
        console.log(`Test on ${URL} finished 🦄`, res)
    }
}
```

##### Emulate network conditions (Average 3G)

```js
{
    name: "Network conditions",
    when: "before",
    twice: false,
    run: async (browser, page, URL) => {
        await page.emulateNetworkConditions({
            download: ((1.6 * 1000 * 1000) / 8) * 0.9,
            upload: ((750 * 1000) / 8) * 0.9,
            latency: 150 * 3.75,
        });
    },
};
```

See the `examples` folder for more examples.