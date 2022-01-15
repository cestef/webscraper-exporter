import axios from "axios";
import { bold, whiteBright } from "colorette";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import fuzzy from "fuzzy";
import inquirer from "inquirer";
import autocomplete from "inquirer-autocomplete-prompt";
import LightSpinner from "light-spinner";
import { join } from "path";
import simpleGit from "simple-git";
import Yargs from "yargs";
import Logger from "../../Logger";
const { prompt, registerPrompt } = inquirer;
const git = simpleGit();

const GITHUB_REGEXP =
    /^(?:(?:https:\/\/github.com\/([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}\/[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})(?:\.git)?)|([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}\/[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}))$/i;

const TEMPLATES = readdirSync(join(__dirname, "../../../templates")).map((e) => {
    const templatePath = join(__dirname, "../../../templates", e);
    if (existsSync(join(templatePath, "wsce.properties.json")))
        return JSON.parse(readFileSync(join(templatePath, "wsce.properties.json"), "utf8"))?.name;
    else
        return e
            .split(" ")
            .map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase())
            .join(" ");
});
registerPrompt("autocomplete", autocomplete);

export const command = "init [name]";

export const describe = "Init a new wsce project";

export const builder = (yargs: typeof Yargs) =>
    yargs
        .positional("name", { describe: "Name for your project", type: "string" })
        .option("template", { describe: "The template to use for this project", type: "string" })
        .option("verbose", {
            alias: "v",
            type: "boolean",
            count: true,
        });

export const handler = async (args: any) => {
    const logger = new Logger(false, args.v);
    if (args.name && !/^([A-Za-z\-\_\d])+$/.test(args.name))
        return logger.error(
            "Project name may only include letters, numbers, underscores and hashes."
        );
    if (args.template && !existsSync(join(__dirname, "../../../templates", args.template)))
        return logger.error(`The "${args.template}" does not exist !`);
    const QUESTIONS = [
        {
            name: "template",
            type: "autocomplete",
            message: "What project template would you like to generate?",
            source: async (_: any, input: string) => {
                input = input || "";
                const githubMatches = input.match(GITHUB_REGEXP);
                if (githubMatches) return [githubMatches[1]];
                return fuzzy.filter(input, TEMPLATES).map((e) => e.original);
            },
            suggestOnly: true,
            when: !Boolean(args.template),
            validate: async (input: string) => {
                input = input || "";
                if (TEMPLATES.some((e) => e.toLowerCase() === input.toLowerCase())) return true;
                const githubUrl = getGithubURL(input);
                if (githubUrl) {
                    try {
                        const { data: commits } = await axios.get(
                            `https://api.github.com/repos/${githubUrl.parsed}/commits`
                        );
                        const sha = commits[0].commit.tree.sha;
                        const {
                            data: { tree },
                        } = await axios.get(
                            `https://api.github.com/repos/${githubUrl.parsed}/git/trees/${sha}`
                        );
                        return (
                            tree.some((e: string) =>
                                ["wsce.config.js", "wsce.properties.json"].every((f) => e === f)
                            ) || "The repo isn't a template"
                        );
                    } catch (e) {
                        logger.debug(`\nCouldn't GET the repo URL: ${e}`);
                        return "No Github / Template found for this";
                    }
                }
            },
        },
        {
            name: "name",
            type: "input",
            message: "Project name:",
            validate: (input: string) =>
                /^([A-Za-z\-\_\d])+$/.test(input)
                    ? true
                    : "Project name may only include letters, numbers, underscores and hashes.",
            when: !Boolean(args.name),
        },
    ];
    const answers = await prompt<any>(QUESTIONS);
    const template = answers.template || args.template;
    const templatePath = join(__dirname, "../../../templates", template.replace("/", "-"));
    const name = answers.name || args.name;
    const spinner = new LightSpinner({ text: "Initializing the project..." });
    spinner.start();

    const projectPath = join(process.cwd(), name);
    const githubURL = getGithubURL(template);
    if (githubURL && !existsSync(templatePath)) {
        spinner.text = "Cloning the repository...";
        try {
            await git.clone(githubURL.url, templatePath);
        } catch (e) {
            spinner.stop();
            return logger.error("Couldn't clone the repository: " + e);
        }
    }
    if (existsSync(projectPath)) {
        spinner.stop();
        return logger.error(
            `A folder named "${name}" already exists, please remove it before creating a new project`
        );
    }

    spinner.text = "Copying files...";
    mkdirSync(projectPath);
    createDirectoryContents(templatePath, name, ["wsce.properties.json"]);
    spinner.stop();
    logger.success(`Finished creating your project !
    - Use ${whiteBright(bold(`cd ${name}`))} to start hacking !
    - Edit ${whiteBright(bold(`wsce.config.js`))} to edit the configuration.`);
};

const createDirectoryContents = (
    templatePath: string,
    newProjectPath: string,
    ignore?: string[]
) => {
    const filesToCreate = readdirSync(templatePath).filter((e) => !ignore?.includes(e));
    filesToCreate.forEach((file) => {
        const origFilePath = join(templatePath, file);
        const stats = statSync(origFilePath);
        if (stats.isFile()) {
            writeFileSync(
                join(process.cwd(), newProjectPath, file),
                readFileSync(origFilePath, "utf8"),
                "utf8"
            );
        } else if (stats.isDirectory()) {
            mkdirSync(join(process.cwd(), newProjectPath, file));
            createDirectoryContents(origFilePath, join(newProjectPath, file));
        }
    });
};

const getGithubURL = (input: string) => {
    const matches = input.match(GITHUB_REGEXP);
    if (matches) return { url: `https://github.com/${matches[1]}.git`, parsed: matches[1] };
    return null;
};
