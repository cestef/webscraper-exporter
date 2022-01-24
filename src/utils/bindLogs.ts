import { EventEmitter } from "events";
import Logger from "./Logger";

export default (logger: Logger, ...emitters: EventEmitter[]) => {
    emitters.forEach((e) => {
        e.on("debug", (m) => logger.debug(m));
        e.on("error", (m) => logger.error(m));
        e.on("info", (m) => logger.info(m));
        e.on("warn", (m) => logger.warn(m));
    });
};
