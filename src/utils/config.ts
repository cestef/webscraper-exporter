import { readdirSync } from "fs-extra";
import path, { resolve, dirname } from "path";
import { join } from "path";
const getFiles = (dir: string): string[] => {
    const dirents = readdirSync(dir, { withFileTypes: true });
    const files = dirents.map((dirent) => {
        const res = resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    });
    return Array.prototype.concat(...files);
};

export default (basePath: string): string[] => {
    var testedFolder = dirname(basePath);
    const files = getFiles(testedFolder);
    const configsPaths = files.filter((e) => /^(?:.*\.)?wsce.config.js$/.test(e));
    return configsPaths;
};

export const load = async (pathToConfig: string) => {
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
