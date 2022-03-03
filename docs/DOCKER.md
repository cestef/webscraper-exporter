# Using `wsce` with [Docker](https://docker.com)

You can build your own `wsce` Docker image in just a few steps !

## Prerequisites

- Make sure your have Docker installed (https://docs.docker.com/engine/install/)

## Configuring

All the configuration part happens in `docker.wsce.config.js` as this is the config file being copied to the image. You can change this behavior by editing this line in the `Dockerfile`:

```Dockerfile
COPY config/docker.wsce.config.js config/wsce.config.js
```

You can then edit your configuration file so it looks something like this:

```js
// docker.wsce.config.js

module.exports = {
    scraper: {
        urls: ["https://cstef.dev"],
        puppeteerOptions: { 
            executablePath: "/usr/bin/chromium-browser",
            args: ["--no-sandbox"],
        }, 
        interval: 60_000,
        addons: [],
    },
    exporter: {
        port: 9924,
    },
};
```
If you're having trouble with configuration, head over to [CONFIGURING.md](./CONFIGURING.md)

### :warning: WARNING
Make sure you pass `"/usr/bin/chromium-browser"` as the executable's Path and `--no-sandbox` as additional args to puppeteer's options !

## Building

Make sure again to have the Docker CLI installed, then run the following in the project's root folder to build the image:

```
docker buildx build -t wsce:latest .   
```

If you've followed the previous steps correctly, you should now have a Docker image named `wsce` with the `latest` tag.

```
docker image ls
```

## Running

```
docker run -d \                                                          
  --name devtest \
  -p 3000:9924 \
  wsce:latest
```

You can then access the exporter's metrics at [`localhost:3000`](http://localhost:3000)

## Stopping

First, get your container's ID by finding it with

```
docker container ls
```

Once you've got your ID, you can stop the container by running

```
docker stop ID
```
Where `ID` is your container's ID