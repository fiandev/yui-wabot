import { translate as gtrans } from "@vitalets/google-translate-api";
import fs from "fs";
import { dirname } from "path";

// Define the directory for cache files. This is cleaner than embedding ':lang'.
const CACHE_DIR = process.env.TRANSLATION_PATH || "./lang";

/**
 * In-memory cache to avoid reading from the disk on every request.
 * Structure: Map<language_code, Map<original_text, translated_text>>
 * e.g., "id" -> Map { "hello" -> "halo" }
 */
const memoryCache = new Map<string, Map<string, string>>();

/**
 * Returns the standardized file path for a given language's cache.
 */
function getCacheFilePath(lang: string): string {
    return `${CACHE_DIR}/${lang}.json`;
}

/**
 * Lazily loads a language's translation file into the in-memory cache.
 * If the file doesn't exist or is invalid, it initializes an empty cache.
 */
async function loadCacheForLang(lang: string): Promise<void> {
    // If it's already in memory, we're done.
    if (memoryCache.has(lang)) {
        return;
    }

    const filePath = getCacheFilePath(lang);
    try {
        // Ensure the directory exists before trying to read.
        await fs.mkdirSync(dirname(filePath), { recursive: true });
        const fileContent = await fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(fileContent);
        // Load file content into the in-memory Map.
        memoryCache.set(lang, new Map(Object.entries(data)));
    } catch (error) {
        // If the file doesn't exist or is corrupt, start with an empty cache.
        memoryCache.set(lang, new Map());
    }
}

/**
 * Saves a new translation to the cache (both in-memory and to the file).
 * It writes the entire cache for the language to ensure data consistency.
 */
async function saveTranslation(originalText: string, translatedText: string, lang: string): Promise<void> {
    // Ensure the cache for this language is initialized.
    const langCache = memoryCache.get(lang) ?? new Map<string, string>();

    // Update the in-memory cache.
    langCache.set(originalText, translatedText);
    memoryCache.set(lang, langCache);

    // Persist the entire updated cache to disk.
    const filePath = getCacheFilePath(lang);
    const data = Object.fromEntries(langCache);
    await fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Main translation function with caching.
 * @param text The text to translate.
 * @param to The target language code (e.g., "id").
 * @returns The translated text, or the original text on failure.
 */
export async function translate(text: string, to: string = "id"): Promise<string> {
    const key = text?.trim();
    if (!key) {
        return text; // Return original if input is empty or just whitespace.
    }

    // 1. Ensure the cache for the target language is loaded into memory.
    await loadCacheForLang(to);

    // 2. Check the in-memory cache first for the fastest result.
    const cached = memoryCache.get(to)?.get(key);
    if (cached) {
        return cached;
    }

    // 3. If not in cache, call the external API.
    try {
        const { text: translatedText } = await gtrans(key, { to });

        // 4. Save the new translation to the cache for future use.
        await saveTranslation(key, translatedText, to);

        return translatedText;
    } catch (error) {
        console.error(`Translation failed for "${key}" to "${to}":`, error);
        return text; // Fallback: return the original text on API error.
    }
}

/**
 * A convenient, short alias for the translate function.
 */
export const t = translate;