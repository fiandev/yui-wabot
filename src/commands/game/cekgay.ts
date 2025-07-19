import { type Command } from "../../../types/Command";

const gayResponses = ["Mungkin", "Sepertinya", "Bisa jadi", "Yakin"];

export const cekgay: Command = {
    name: "cekgay",
    description: "Tes seberapa gay seseorang",
    usage: ".cekgay @mention",
    cmd: ["cekgay"],
    isMedia: false,
    category: "game",
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid!;
        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        if (!mentions.length) {
            await sock.sendMessage(jid, { text: "Tag seseorang untuk dites gay-nya.\nContoh: .cekgay @kontak" });
            return;
        }

        const percentage = Math.floor(Math.random() * 101); // 0-100
        const response = gayResponses[Math.floor(Math.random() * gayResponses.length)];
        const target = mentions[0];

        await sock.sendMessage(jid, {
            text: `${response}, @${target.split("@")[0]} ${percentage}% gay 🌈`,
            mentions: [target]
        }, { quoted: msg });
    }
}
