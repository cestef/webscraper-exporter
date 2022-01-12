const Logger = {
    name: "Logger",
    twice: false,
    run: (browser, page, URL) => {
        console.log("I am running on " + URL);
    },
};
export default Logger;
