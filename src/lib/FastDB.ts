import { exists, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { gzipSync, gunzipSync } from "zlib";
import LogError from "../exceptions/LogError";
import log from "../utils/log";
import crypto from "crypto";
interface FastDBOptions {
    is_compress?: boolean;
}

class FastDB {
    private static instances: Map<string, FastDB> = new Map();
    public data: Map<string, any> = new Map();
    private pathFile: string;
    private originalPath: string;
    private saveTimeout: NodeJS.Timeout | null = null;
    public is_compress: boolean;

    private constructor(pathFile: string, options: FastDBOptions = { is_compress: false }) {
        this.originalPath = pathFile;
        this.is_compress = options.is_compress ?? false;

        // Handle file extension based on compression setting
        if (this.is_compress) {
            this.pathFile = resolve(pathFile.endsWith(".gz") ? pathFile : pathFile + ".gz");
        } else {
            // Remove .gz extension if present when compression is disabled
            const cleanPath = pathFile.replace(/\.gz$/, '');
            this.pathFile = resolve(cleanPath.endsWith(".json") ? cleanPath : cleanPath + ".json");
        }

        if (!existsSync(this.pathFile)) {
            try {
                if (this.is_compress) {
                    const compressedEmpty = gzipSync(JSON.stringify({}));
                    writeFileSync(this.pathFile, compressedEmpty);
                } else {
                    writeFileSync(this.pathFile, JSON.stringify({}, null, 2));
                }
            } catch (err) {
                throw new LogError("[FastDB] Gagal membuat file kosong", err as Error);
            }
        }

        this.loadFromFile();
        this.setupAutoSave();
    }

    public static load(pathFile: string, options: FastDBOptions = {}): FastDB {
        const is_compress = options.is_compress ?? true;

        // Create consistent path key for instance tracking
        let resolvedPath: string;
        if (is_compress) {
            resolvedPath = resolve(pathFile.endsWith(".gz") ? pathFile : pathFile + ".gz");
        } else {
            const cleanPath = pathFile.replace(/\.gz$/, '');
            resolvedPath = resolve(cleanPath.endsWith(".json") ? cleanPath : cleanPath + ".json");
        }

        // Return existing instance if already loaded
        if (FastDB.instances.has(resolvedPath)) {
            const existingInstance = FastDB.instances.get(resolvedPath)!;
            // Update compression setting if it changed
            if (existingInstance.is_compress !== is_compress) {
                existingInstance.is_compress = is_compress;
                existingInstance.pathFile = resolvedPath;
            }
            return existingInstance;
        }

        // Create new instance and store it
        const instance = new FastDB(pathFile, options);
        FastDB.instances.set(resolvedPath, instance);
        return instance;
    }

    private loadFromFile() {
        try {
            if (this.is_compress) {
                const compressed = readFileSync(this.pathFile);
                const decompressed = gunzipSync(compressed).toString();
                const parsed = JSON.parse(decompressed);
                this.loadParsedData(parsed);
            } else {
                const content = readFileSync(this.pathFile, 'utf8');
                const parsed = JSON.parse(content);
                this.loadParsedData(parsed);
            }
        } catch (err) {
            throw new LogError("[FastDB] Gagal membaca atau parse file DB", err as Error);
        }
    }

    private loadParsedData(parsed: any) {
        // Clear existing data first
        this.data.clear();

        if (parsed && typeof parsed === "object") {
            for (const [key, value] of Object.entries(parsed)) {
                this.data.set(key, value);
            }
        }
    }

    public get(key: string, alternative?: any) {
        return this.data.get(key) || alternative;
    }

    public set(key: string, value: any) {
        let data = this.get(key);

        // Kalau belum ada data sama sekali
        if (Array.isArray(value) && value.length === 0) {
            this.data.set(key, []);
            return this.saveToFile();
        }

        if (!data) {
            this.data.set(key, value);
            return this.saveToFile();
        }

        const hash1 = crypto.createHash("sha256").update(JSON.stringify(data) || data).digest("hex");

        // Kalau data sudah array
        if (Array.isArray(data)) {
            this.data.set(key, [...Array.from(new Set([...data, ...value]))]);
            return this.saveToFile();
        }

        // Kalau bukan array, dan data berbeda, ganti
        const hash2 = crypto.createHash("sha256").update(JSON.stringify(value) || value).digest("hex");

        if (hash1 !== hash2) {
            this.data.set(key, value);
            return this.saveToFile();
        }
    }

    public has(key: string) {
        return this.data.has(key);
    }

    public delete(key: string) {
        const result = this.data.delete(key);
        if (result) {
            this.saveToFile(); // Auto-save after modifications
        }
        return result;
    }

    public all() {
        return Object.fromEntries(this.data.entries());
    }

    // Toggle compression setting
    public setCompression(compress: boolean) {
        if (this.is_compress !== compress) {
            this.is_compress = compress;

            // Update file path
            if (compress) {
                this.pathFile = resolve(this.originalPath.endsWith(".gz") ? this.originalPath : this.originalPath + ".gz");
            } else {
                const cleanPath = this.originalPath.replace(/\.gz$/, '');
                this.pathFile = resolve(cleanPath.endsWith(".json") ? cleanPath : cleanPath + ".json");
            }

            // Save with new format
            this.saveToFile();
        }
    }

    // ✅ Fixed flush method - no longer creates new instance
    public flush() {
        this.saveToFile();
        this.loadFromFile();
    }

    // Reload data from file (useful if file was modified externally)
    public reload() {
        this.loadFromFile();
    }

    private scheduleRemoveJunkData() {
        // Debounce saves to avoid excessive I/O
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            let users = this.get("users") || [];
            users = users.filter((user: any) => user.jid);

            this.set("users", users);
            this.saveToFile();
        }, 1000); // Save after 1 second of inactivity
    }

    public debug() {
        return {
            pathFile: this.pathFile,
            originalPath: this.originalPath,
            is_compress: this.is_compress,
            dataSize: this.data.size,
            keys: Array.from(this.data.keys()),
            users: this.get("users"),
            instanceId: this.constructor.name + '_' + Math.random().toString(36).substr(2, 9)
        };
    }

    private saveToFile() {
        try {
            const obj = Object.fromEntries(this.data.entries());

            if (this.is_compress) {
                const compressed = gzipSync(JSON.stringify(obj));
                writeFileSync(this.pathFile, compressed);
                // log.info(`[FastDB] Data saved (compressed) to ${this.pathFile}`);
            } else {
                writeFileSync(this.pathFile, JSON.stringify(obj, null, 2));
                // log.info(`[FastDB] Data saved (JSON) to ${this.pathFile}`);
            }

            // console.log("[FastDB] Current instance debug:", this.debug());
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

        // process.on("uncaughtException", (err) => {
        //     this.saveToFile();
        //     log.error(`[uncaughtException] Uncaught Exception: ${err}`);
        // });

        // process.on("unhandledRejection", (reason) => {
        //     this.saveToFile();
        //     log.error(`[unhandledRejection] Unhandled Rejection: ${reason}`);
        // });
    }
}

export default FastDB;