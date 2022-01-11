import Yargs from "yargs";
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { prompt, QuestionCollection, registerPrompt, Separator } from "inquirer";
import Logger from "../../Logger";
import Spin from "light-spinner";
import autocomplete from "inquirer-autocomplete-prompt";
import fuzzy from "fuzzy";
import axios from "axios";
import simpleGit from "simple-git";
const git = simpleGit();
import { bold, whiteBright } from "colorette";
import { exec as e } from "child_process";
import { promisify } from "util";
const exec = promisify(e);

const TEMPLATES = readdirSync(join(__dirname, "../../../templates")).map((e) =>
    e
        .split(" ")
        .map((w) => w[0].toUpperCase() + w.substr(1).toLowerCase())
        .join(" ")
);
registerPrompt("autocomplete", autocomplete);

exports.command = "init [name]";

exports.describe = "Init a new wsce project";

exports.builder = (yargs: typeof Yargs) =>
    yargs
        .positional("name", { describe: "Name for your project", type: "string" })
        .option("template", { describe: "The template to use for this project", type: "string" })
        .option("verbose", {
            alias: "v",
            type: "boolean",
            count: true,
        });

exports.handler = async (args: any) => {
    const logger = new Logger(false, args.v);
    if (args.name && !/^([A-Za-z\-\_\d])+$/.test(args.name))
        return logger.error(
            "Project name may only include letters, numbers, underscores and hashes."
        );
    if (args.template && !existsSync(join(__dirname, "../../../templates", args.template)))
        return logger.error(`The "${args.template}" does not exist !`);
    const QUESTIONS: QuestionCollection = [
        {
            name: "template",
            type: "autocomplete",
            message: "What project template would you like to generate?",
            source: async (_: any, input: string) => {
                input = input || "";
                if (/.+\/.+/.test(input)) return [input];
                return fuzzy.filter(input, TEMPLATES).map((e) => e.original);
            },
            suggestOnly: true,
            when: !Boolean(args.template),
            validate: async (input: string) => {
                input = input || "";
                if (TEMPLATES.some((e) => e.toLowerCase() === input.toLowerCase())) return true;
                if (/.+\/.+/.test(input)) {
                    try {
                        const { data: commits } = await axios.get(
                            `https://api.github.com/repos/${input}/commits`
                        );
                        const sha = commits[0].commit.tree.sha;
                        const {
                            data: { tree },
                        } = await axios.get(
                            `https://api.github.com/repos/${input}/git/trees/${sha}`
                        );
                        return (
                            tree.some((e: any) =>
                                ["wsce.config.js", "wsce.config.ts"].includes(e.path)
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

    const spinner = new Spin({ text: "Initializing the proejct..." });
    spinner.start();

    const projectPath = join(process.cwd(), name);
    if (/.+\/.+/.test(template) && !existsSync(templatePath)) {
        spinner.text = "Cloning the repository...";
        try {
            await git.clone(`https://github.com/${template}.git`, templatePath);
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
    createDirectoryContents(templatePath, name);
    spinner.text = "Installing dependencies";
    await installDir(name);
    spinner.stop();
    logger.success(`Finished creating your project !
    - Use ${whiteBright(bold(`cd ${name}`))} to start hacking !
    - Edit ${whiteBright(
        bold(`wsce.config.${template === "Typescript" ? "ts" : "js"}`)
    )} to edit the configuration.`);
};

const createDirectoryContents = (templatePath: string, newProjectPath: string) => {
    const filesToCreate = readdirSync(templatePath);
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

export const installDir = async (dir: string) => {
    let hasYarn: boolean = false;
    try {
        await exec("yarn --version");
        hasYarn = true;
    } catch {}
    const packageJSONPath = join(process.cwd(), dir, "package.json");
    if (!existsSync(packageJSONPath))
        writeFileSync(
            packageJSONPath,
            readFileSync(join(__dirname, "../../..", "default.package.json"), "utf8")
                .replace("{name}", dir)
                .replace(
                    "{version}",
                    JSON.parse(readFileSync(join(__dirname, "../../../package.json"), "utf8"))
                        .version
                ),
            "utf8"
        );
    return await exec(`cd ${dir} && ${hasYarn ? "yarn" : "npm install"}`);
};
