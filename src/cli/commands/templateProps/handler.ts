import { Logger } from "../../../utils";
import inquirer from "inquirer";
import { join } from "path";
import {
    readJSONSync,
    moveSync,
    copySync,
    rm,
    readdirSync,
    statSync,
    existsSync,
    readFileSync,
} from "fs-extra";
import { nanoid } from "nanoid";
import { bold, greenBright, red, whiteBright } from "colorette";

const GITHUB_REGEXP =
    /^(?:(?:https:\/\/github.com\/([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}\/[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})(?:\.git)?)|([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}\/[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}))$/i;

import simpleGit from "simple-git";

const git = simpleGit();

const templatesPath = join(__dirname, "../../../../templates");
export const handler = async (args: any) => {
    const logger = new Logger(false, 3);
    if (!existsSync(templatesPath))
        return logger.error(`Templates path ${red(templatesPath)} not found`);
    const TEMPLATES = readdirSync(templatesPath)
        .filter((e) => statSync(join(templatesPath, e)).isDirectory())
        .map((e) => {
            const templatePath = join(templatesPath, e);
            if (existsSync(join(templatePath, "wsce.properties.json")))
                return {
                    name: JSON.parse(
                        readFileSync(join(templatePath, "wsce.properties.json"), "utf8")
                    )?.name,
                    path: e,
                };
            else
                return {
                    path: e,
                    name: e
                        .split(" ")
                        .map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase())
                        .join(" "),
                };
        });
    switch (args.command) {
        case "add": {
            let { template } = await inquirer.prompt({
                name: "template",
                message: "Enter the template path / repo URL",
                type: "input",
                validate: async (input: string) => {
                    input = input || "";
                    const path = resolvePath(input);
                    if (path) {
                        const stat = statSync(path);
                        const files = readdirSync(path);
                        if (
                            stat.isDirectory() &&
                            ["wsce.config.js", "wsce.properties.json"].every((e) =>
                                files.some((f) => f === e)
                            )
                        )
                            return true;
                        else return "Path isn't a template";
                    }
                    const githubURL = getGithubURL(input);
                    if (githubURL) {
                        try {
                            await git.listRemote([githubURL.url]);
                            return true;
                        } catch {
                            return "Repository not found";
                        }
                    } else return "Not a valid path or repo URL";
                },
            });
            const githubURL = getGithubURL(template);
            if (githubURL) {
                logger.info("Cloning the template");
                const tempID = nanoid();
                const tempPath = join(__dirname, "../../../templates", tempID);
                await git.clone(githubURL.url, tempPath);
                const templateName =
                    readJSONSync(join(tempPath, "wsce.properties.json"), "utf8")?.name || tempID;
                moveSync(
                    tempPath,
                    join(templatesPath, templateName.split(" ").join("-").toLowerCase()),
                    { overwrite: true }
                );
                logger.log("success", greenBright, [
                    [
                        `Successfully cloned the template, you can now use it: ${whiteBright(
                            bold(templateName)
                        )}`,
                    ],
                ]);
            } else {
                logger.info("Copying the template");
                const tempID = nanoid();
                const tempPath = join(__dirname, "../../../templates", tempID);
                copySync(resolvePath(template) as string, tempPath);
                const templateName =
                    readJSONSync(join(tempPath, "wsce.properties.json"), "utf8")?.name || tempID;
                moveSync(
                    tempPath,
                    join(templatesPath, templateName.split(" ").join("-").toLowerCase()),
                    { overwrite: true }
                );
                logger.log("success", greenBright, [
                    [
                        `Successfully copied the template, you can now use it: ${whiteBright(
                            bold(templateName)
                        )}`,
                    ],
                ]);
            }
            break;
        }
        case "remove": {
            const { templates } = await inquirer.prompt({
                message: "Which template(s) do you want to remove ?",
                choices: TEMPLATES.map((e) => ({ value: e.path, name: e.name })),
                name: "templates",
                type: "checkbox",
            });
            for (let template of templates)
                rm(join(templatesPath, template), { recursive: true, force: true });
            logger.log("success", greenBright, [
                [
                    `Successfully deleted ${whiteBright(bold(templates.length))} template${
                        templates.length > 1 ? "s" : ""
                    }`,
                ],
            ]);

            break;
        }
        case "list": {
            console.log(`Templates dir: ${whiteBright(bold(templatesPath))}`);
            console.log(
                TEMPLATES.map((e) => `- ${e.name} => ${whiteBright(bold(e.path))}`).join("\n")
            );
            break;
        }
    }
};
const getGithubURL = (input: string) => {
    const matches = input.match(GITHUB_REGEXP);
    if (matches && (matches[1] || matches[0]))
        return {
            url: `https://github.com/${matches[1] || matches[0]}.git`,
            parsed: matches[1] || matches[0],
        };
    return null;
};
const resolvePath = (input: string): string | null => {
    const relative = join(process.cwd(), input);
    if (existsSync(relative)) return relative;
    const absolute = input;
    if (existsSync(absolute)) return absolute;
    const dirnameRelative = join(__dirname, input);
    if (existsSync(dirnameRelative)) return dirnameRelative;
    return null;
};
