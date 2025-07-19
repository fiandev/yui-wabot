import { type Command } from "../../../types/Command";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export const httrack: Command = {
    name: "httrack",
    description: "Download website using wget",
    usage: ".httrack <url>",
    cmd: ["httrack"],
    isMedia: false,
    category: "tools",
    isPremium: true,
    isAuth: true,

    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid!;
        const url = args?.[0];

        if (!url) {
            await sock.sendMessage(jid, { text: "Kamu belum menuliskan url website yang ingin kamu download.\nContoh: .httrack https://example.com" });
            return;
        }

        // Folder kerja unik berdasarkan timestamp
        const timestamp = Date.now();
        const outputDir = path.join("/tmp", `httrack_${timestamp}`);
        const zipPath = `${outputDir}.zip`;

        try {
            await sock.sendMessage(jid, { text: "📥 Memulai download website, mohon tunggu..." }, { quoted: msg });

            // Buat folder
            fs.mkdirSync(outputDir);

            // Download website pakai wget
            const cmd = `wget --mirror --convert-links --adjust-extension --page-requisites --no-parent -P ${outputDir} ${url}`;
            await execAsync(cmd);

            // Kompres hasil jadi zip
            const zipCmd = `zip -r ${zipPath} ${outputDir}`;
            await execAsync(zipCmd);

            // Kirim zip hasilnya
            const fileData = fs.readFileSync(zipPath);
            await sock.sendMessage(jid, {
                document: fileData,
                fileName: `website-${timestamp}.zip`,
                mimetype: "application/zip",
            }, { quoted: msg });

        } catch (error) {
            console.error("[httrack error]", error);
            await sock.sendMessage(jid, {
                text: "❌ Gagal mendownload atau mengompres website. Pastikan URL valid dan server mendukung akses."
            }, { quoted: msg });
        } finally {
            // Cleanup (opsional)
            try {
                fs.rmSync(outputDir, { recursive: true, force: true });
                fs.unlinkSync(zipPath);
            } catch (e) {
                console.warn("Gagal hapus file sementara", e);
            }
        }
    }
}
