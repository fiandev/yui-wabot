import { translate as gtrans } from "@vitalets/google-translate-api";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

export const TRANSLATION_PATH = process.env.TRANSLATION_PATH || "./lang/:lang.json";

export function saveTranslation (text: string, to: string): void {
    if (!existsSync(dirname(TRANSLATION_PATH))) {
        mkdirSync(dirname(TRANSLATION_PATH), { recursive: true });
    }
    
    const translationPathFile = TRANSLATION_PATH.replace(":lang", to);
    const data = existsSync(translationPathFile) ? JSON.parse(readFileSync(translationPathFile, "utf-8")) : {};
    data[to] = text;

    writeFileSync(translationPathFile, JSON.stringify(data, null, 2)); 
}

export function checkTranslation (text: string, to: string): string | null {
    if (!existsSync(dirname(TRANSLATION_PATH))) {
        mkdirSync(dirname(TRANSLATION_PATH), { recursive: true });
    }

    const translationPathFile = TRANSLATION_PATH.replace(":lang", to);

    if (!existsSync(translationPathFile)) return null;

    const key = text.trim();
    const data = JSON.parse(readFileSync(translationPathFile, "utf-8"));
    return data[key] || null;
}

export async function t(text: string, to: string = "id") {
    try {
        return await translate(text, to);
    } catch (error) {
        return text;
    }
}

export default async function translate (text: string, to: string = "id") {
    const prevTranslation = checkTranslation(text, to);

    if (prevTranslation) return prevTranslation;
    
    let result = await gtrans(text, { to });

    saveTranslation(result.text, to);

    return result.text;
}