import { accessSync, readdirSync, statSync, constants } from "fs-extra";
import path, { resolve, parse, join } from "path";
import { whiteBright } from "colorette";
import { Logger } from ".";

const getFiles = (dir: string, depth: number, logger: Logger): string[] => {
    try {
        const dirents = readdirSync(dir);
        const files = dirents.map((dirent) => {
            const res = resolve(dir, dirent);
            const isDirectory = statSync(res).isDirectory();
            try {
                accessSync(res, constants.R_OK);
                return depth > 0
                    ? isDirectory
                        ? getFiles(res, depth - 1, logger)
                        : res
                    : isDirectory
                    ? null
                    : res;
            } catch (e: any) {
                if (e.code !== "EPERM" && e.code !== "EACCES") {
                    throw e;
                }
                return isDirectory ? [] : null;
            }
        });
        return Array.prototype.concat(...files).filter((e) => e !== null);
    } catch (e: any) {
        logger.debug(`${whiteBright(`Couldn't search for a config file in ${dir} `)} : ${e}`);
        return [];
    }
};

export const findConfig = (basePath: string, depth: number = 3, logger: Logger): string[] => {
    const files = getFiles(basePath, depth, logger);
    const configsPaths = files.filter((e) =>
        /^(?:(?!default).*\.)?wsce.config.js$/.test(parse(e).base)
    );
    return configsPaths;
};

export const loadConfig = async (pathToConfig: string) => {
    pathToConfig = pathToConfig.trim();
    let res: { config: any; error: any } = { config: null, error: null };
    switch (path.isAbsolute(pathToConfig)) {
        case true: {
            try {
                const imported = await import(pathToConfig);
                res.config = imported?.default || imported;
            } catch (e) {
                res.error = e;
            }
            break;
        }
        case false: {
            try {
                const imported = await import(join(process.cwd().trim(), pathToConfig));
                res.config = imported?.default || imported;
            } catch (e) {
                res.error = e;
            }
            break;
        }
    }
    return res;
};
