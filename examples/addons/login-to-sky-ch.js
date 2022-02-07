const email = "example@gmail.com";
const password = "SecretPassword";

const Login = {
    name: "Login to Sky",
    when: "before",
    twice: false,
    run: async (_, page, url) => {
        try {
            await page.goto(`${url}${url.endsWith("/") ? "" : "/"}de/login`);
            const SELECTORS = {
                username: 'input[id="inputUsername"]',
                password: 'input[id="inputPassword"]',
                submit: 'button[type="submit"]',
            };
            for (let selector of Object.values(SELECTORS)) {
                try {
                    await page.waitForSelector(selector, { timeout: 5000 });
                } catch {
                    return false;
                }
            }
            await page.type(SELECTORS.username, email);
            await page.type(SELECTORS.password, password);
            await page.$eval(SELECTORS.submit, (e) => e.click());
            try {
                await page.waitForNavigation({ timeout: 5000 });
            } catch {
                return false;
            }
            return true;
        } catch (e) {
            logger.debug("An Error occured when logging in to " + url, e);
        }
    },
};

module.exports = Login;
