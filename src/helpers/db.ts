// db-helper.ts
import FastDB from "../lib/FastDB";

// Ensure global.db is always available
export function ensureDB(): FastDB {
    if (!global.db) {
        console.log("[DB Helper] Global.db not found, initializing...");
        global.db = FastDB.load(process.env.APP_ENV === "production" ?
            "./storage/db.production.zip" :
            "./storage/db.zip"
        );
    }
    return global.db;
}

// Safe getter with default values
export function safeGet<T>(key: string, defaultValue: T): T {
    const db = ensureDB();
    const value = db.get(key);

    if (value === undefined || value === null) {
        console.log(`[DB Helper] Key "${key}" not found, setting default:`, defaultValue);
        db.set(key, defaultValue);
        return defaultValue;
    }

    return value as T;
}

// Initialize common keys with default values
export function initializeDefaults() {
    const db = ensureDB();

    // Initialize with defaults if they don't exist
    if (!db.has("users")) {
        console.log("[DB Helper] Initializing 'users' with empty array");
        db.set("users", []);
    }

    if (!db.has("auto-reply-chats")) {
        console.log("[DB Helper] Initializing 'auto-reply-chats' with empty array");
        db.set("auto-reply-chats", []);
    }

    // Add other default keys as needed
    console.log("[DB Helper] Defaults initialized. Current keys:", Array.from(db.data.keys()));
}

// Debug function to check database state
export function debugDB() {
    const db = ensureDB();
    console.log("=== DATABASE DEBUG INFO ===");
    console.log("Instance exists:", !!global.db);
    console.log("Data size:", db.data.size);
    console.log("All keys:", Array.from(db.data.keys()));
    console.log("All data:", db.all());
    console.log("========================");
    return db.debug();
}