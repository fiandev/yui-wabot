import log from "../utils/log";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

export default class LogError {
    private pathFile: string;

    constructor(message: string, error?: Error) {
      this.pathFile = process.env.LOG_PATH || "./storage/logs/error.log";
      this.execute(message, error);
    }

    private execute(message: string, error?: Error) {
        log.error(message);
        this.saveLog(message, error);
    }

    private saveLog(message: string, error?: Error) {
        if (!existsSync(dirname(this.pathFile))) {
            mkdirSync(dirname(this.pathFile));
        }

        appendFileSync(this.pathFile, `${new Date().toLocaleTimeString()} - ${message}\n${error?.stack}\n`);
    }
}