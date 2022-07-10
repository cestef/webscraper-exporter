import { bold, whiteBright, greenBright, blueBright, red } from "colorette";
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    statSync,
    writeFileSync,
    copyFileSync,
} from "fs-extra";
import inquirer from "inquirer";
import { join } from "path";
import Yargs from "yargs";
import { Logger } from "../../utils";
const { prompt } = inquirer;

const templatesPath = join(__dirname, "../../../templates");

export const command = "init [name]";

export const describe = "Init a new wsce project";

export const builder = (yargs: typeof Yargs) =>
    yargs
        .positional("name", { describe: "Name for your project", type: "string" })
        .option("template", { describe: "The template to use for this project", type: "string" })
        .option("typings", {
            type: "boolean",
            default: true,
        });

export const handler = async (args: any) => {
    const logger = new Logger(false, 3);

    if (!existsSync(templatesPath))
        return logger.error(`Template path ${red(templatesPath)} not found`);

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
    if (args.name && !/^([A-Za-z\-\_\d])+$/.test(args.name))
        return logger.error(
            "Project name may only include letters, numbers, underscores and hashes."
        );
    if (args.template && !existsSync(join(templatesPath, args.template)))
        return logger.error(`The ${blueBright(args.template)} template does not exist !`);
    const QUESTIONS = [
        {
            name: "template",
            type: "list",
            choices: TEMPLATES.map((e) => ({ name: e.name, value: e.path })),
            message: "What project template would you like to generate ?",
            when: !Boolean(args.template),
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
    let templatePath = join(templatesPath, template);

    if (!existsSync(templatePath))
        return logger.error(
            "Couldn't find this template, make sure it is correctly installed: ",
            templatePath
        );
    const name = answers.name || args.name;

    const projectPath = join(process.cwd(), name);

    if (existsSync(projectPath)) {
        return logger.error(
            `A folder named ${blueBright(
                name
            )} already exists, please remove it before creating a new project`
        );
    }

    mkdirSync(projectPath);
    createDirectoryContents(templatePath, name, ["wsce.properties.json", ".git"]);
    if (args.typings)
        copyFileSync(join(templatesPath, "wsce.d.ts"), join(process.cwd(), name, "wsce.d.ts"));
    logger.log("success", greenBright, [
        [
            `Finished creating your project !
   - Use ${whiteBright(bold(`cd ${name}`))} to start hacking !
   - Edit ${whiteBright(bold(`wsce.config.js`))} to edit the configuration.${
                args.typings
                    ? `\n   - Typings for the config have been automatically included, if you don't want them, you can pass ${whiteBright(
                          bold("--typings=false")
                      )}`
                    : ""
            }`,
        ],
    ]);
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
