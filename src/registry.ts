import { ping } from "./commands/ping";
import { btcTx } from "./commands/blockchain/btc/tx";
import { sticker } from "./commands/sticker";
import { menu } from "./commands/menu";
import { batchSticker } from "./commands/batch-sticker";
import { batchSticker as batchStickerMiddleware } from "./middlewares/batchSticker";
import { register } from "./commands/auth/register";
import { unregister } from "./commands/auth/unreg";
import { cekjodoh } from "./commands/game/cekjodoh";
import { cekgay } from "./commands/game/cekgay";
import { kapankah } from "./commands/game/kapankah";
import { httrack } from "./commands/pro/httrack";
import { ai } from "./commands/pro/ai";
import { autoReply as autoReplyMiddleware } from "./middlewares/autoReply";
import { toggleAutoReply } from "./commands/pro/toggleAutoReply";
import { downloader } from "./commands/pro/downloader";
import { premium } from "./commands/sudo/premium";
import { forexCalendar } from "./commands/pro/forexCalendar";
import { me } from "./commands/auth/me";
import { qrGenerate } from "./commands/tools/qrGenerate";
import { reqPremium } from "./commands/auth/reqPremium";
import { stockProfile } from "./commands/pro/stock-profile";
import { apakah } from "./commands/game/apakah";
import { execute } from "./commands/sudo/execute";
import { removePremium } from "./commands/sudo/removePremium";

import * as fs from 'fs';
import * as path from 'path';
import type { Command } from 'types/Command'; // <-- Pastikan path ini benar


// --- BAGIAN OTOMATISASI (VERSI BUN) ---

/**
 * Fungsi untuk mencari semua file secara rekursif di dalam sebuah direktori.
 */
const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []): string[] => {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
};

/**
 * Memuat semua command dari direktori 'generated' secara asinkron.
 * @returns Promise yang resolve menjadi array berisi semua objek Command.
 */
const loadGeneratedCommands = async (): Promise<Command[]> => {
    const loadedCommands: Command[] = [];
    const commandsDir = path.join(__dirname, 'commands', 'generated');

    if (!fs.existsSync(commandsDir)) {
        console.warn(`[!] Direktori 'generated' tidak ditemukan. Skipping...`);
        return [];
    }

    // Langsung filter untuk file TypeScript (.ts)
    const commandFiles = getAllFiles(commandsDir)
        .filter(file => file.endsWith('.ts'));

    for (const file of commandFiles) {
        try {
            // Gunakan dynamic import() yang asinkron, lebih modern untuk Bun/ESM
            const commandModule = await import(file);
            for (const key in commandModule) {
                const commandObject = commandModule[key];
                if (commandObject && typeof commandObject.execute === 'function' && commandObject.name) {
                    loadedCommands.push(commandObject);
                }
            }
        } catch (error) {
            console.error(`❌ Gagal memuat command dari file: ${file}`, error);
        }
    }

    console.log(`✅ Berhasil memuat ${loadedCommands.length} command dari direktori 'generated'.`);
    return loadedCommands;
};


// --- EKSPOR FINAL (MENGGUNAKAN TOP-LEVEL AWAIT) ---

// Menunggu semua command dinamis selesai dimuat sebelum mengekspor
const generatedCommands = await loadGeneratedCommands();

// Gabungkan command manual dengan command yang dimuat secara otomatis
export const commands: Command[] = [
    // Command manual Anda
    ping,
    btcTx,
    sticker,
    menu,
    // batchSticker,
    register,
    unregister,
    cekjodoh,
    cekgay,
    kapankah,
    apakah,
    httrack,
    ai,
    toggleAutoReply,
    downloader,
    premium,
    me,
    qrGenerate,
    reqPremium,
    forexCalendar,
    stockProfile,
    execute,
    premium,
    removePremium,
    // ... (tambahkan command manual lain di sini)

    // Semua command dari folder 'generated'
    ...generatedCommands,
];

export const middlewares = [
    autoReplyMiddleware
];