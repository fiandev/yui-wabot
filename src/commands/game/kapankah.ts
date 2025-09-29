import { type Command } from "../../../types/Command";
import { bot } from "../../config/bot";

export const kapankah: Command = {
    name: "kapankah",
    description: "Prediksi waktu untuk pertanyaan",
    usage: ".kapankah <pertanyaan>",
    cmd: ["kapankah"],
    isMedia: false,
    category: "game",
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid!;

        const message = msg?.message?.conversation ||
            msg?.message?.extendedTextMessage?.text ||
            msg?.message?.imageMessage?.caption ||
            msg?.message?.videoMessage?.caption || "";
        const question = message.replace(bot.prefix, '');

        if (!args) {
            await sock.sendMessage(jid, { text: "Kamu belum menuliskan pertanyaannya.\nContoh: .kapankah aku menikah?" });
            return;
        }

        const randomDate = new Date(Date.now() + Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365)); // max 1 tahun dari sekarang
        const formatted = randomDate.toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        await sock.sendMessage(jid, {
            text: `Pertanyaan: ${question}\nJawaban: ${formatted}`
        }, { quoted: msg });
    }
}
