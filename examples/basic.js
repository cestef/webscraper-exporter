const { Exporter, Scraper } = require("webscraper-exporter");

const scraper = new Scraper({
    addons: [],
    urls: ["https://google.com", "https://facebook.com", "https://amazon.com"],
    interval: 60_000,
});
scraper.start();
const exporter = new Exporter({ scraper, port: 3000 });
exporter.start();
