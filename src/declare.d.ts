declare module "path-shorten";
declare module "fs/promises";
declare module "download-chromium" {
    export default function downloadChromium(...args: any[]): Promise<string>;
}
