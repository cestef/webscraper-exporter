import { promisify } from "util";
import { exec as e } from "child_process";
import { platform } from "os";
const exec = promisify(e);

export const hasChromiumInPath = async (): Promise<string | false> => {
    switch (platform()) {
        case "win32":
            return await exec("where chromium")
                .then((e) => e.stdout.trim())
                .catch(() => false);
        case "darwin":
        case "linux":
            return await exec("which chromium")
                .then((e) => e.stdout.trim())
                .catch(() => false);
        default:
            return false;
    }
};
