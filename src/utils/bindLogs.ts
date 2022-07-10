import { EventEmitter } from "events";
import { Logger } from ".";

export const bindLogs = (logger: Logger, ...emitters: EventEmitter[]) => {
    emitters.forEach((e) => {
        e.on("debug", (m) => logger.debug(m));
        e.on("error", (m) => logger.error(m));
        e.on("info", (m) => logger.info(m));
        e.on("warn", (m) => logger.warn(m));
    });
};
export const unbindLogs = (...emitters: EventEmitter[]) => {
    emitters.forEach((e) => {
        e.removeAllListeners();
    });
};
