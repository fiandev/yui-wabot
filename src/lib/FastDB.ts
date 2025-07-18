import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { gzipSync, gunzipSync } from "zlib";
import LogError from "../exceptions/LogError";
import log from "../utils/log";

class FastDB {
    public data: Map<string, any> = new Map();
    private pathFile: string;

    public constructor(pathFile: string) {
        this.pathFile = resolve(pathFile.endsWith(".gz") ? pathFile : pathFile + ".gz");

        if (!existsSync(this.pathFile)) {
            try {
                const compressedEmpty = gzipSync(JSON.stringify({}));
                writeFileSync(this.pathFile, compressedEmpty);
            } catch (err) {
                throw new LogError("[FastDB] Gagal membuat file kosong", err as Error);
            }
        }


        try {
            const compressed = readFileSync(this.pathFile);
            const decompressed = gunzipSync(compressed).toString();
            const parsed = JSON.parse(decompressed);

            if (parsed && typeof parsed === "object") {
                for (const [key, value] of Object.entries(parsed)) {
                    this.data.set(key, value);
                }
            }
        } catch (err) {
            throw new LogError("[FastDB] Gagal membaca atau parse file DB", err as Error);
        }

        this.setupAutoSave();
    }   


    public static load(pathFile: string) {
        return new FastDB(pathFile);
    }

    public get(key: string) {
        return this.data.get(key);
    }

    public set(key: string, value: any) {
        this.data.set(key, value);
    }

    public has(key: string) {
        return this.data.has(key);
    }

    public delete(key: string) {
        return this.data.delete(key);
    }

    public all() {
        return Object.fromEntries(this.data.entries());
    }

    private saveToFile() {
        try {
            const obj = Object.fromEntries(this.data.entries());
            const compressed = gzipSync(JSON.stringify(obj));
            writeFileSync(this.pathFile, compressed);
            log.info(`[FastDB] Data saved (compressed) to ${this.pathFile}`);
            
        } catch (err) {
            throw new LogError(`[FastDB] Save error: ${err}`, err as Error);
        }
    }

    private setupAutoSave() {
        const saveAndExit = () => {
            this.saveToFile();
            process.exit();
        };

        process.on("SIGINT", saveAndExit);
        process.on("SIGTERM", saveAndExit);
        process.on("exit", () => this.saveToFile());

        process.on("uncaughtException", (err) => {
            this.saveToFile();
            log.error(`[FastDB] Uncaught Exception: ${err}`);
        });

        process.on("unhandledRejection", (reason) => {
            this.saveToFile();
            log.error(`[FastDB] Unhandled Rejection: ${reason}`);
        });
    }
}

export default FastDB;
