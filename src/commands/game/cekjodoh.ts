import { type Command } from "../../../types/Command";

export const cekjodoh: Command = {
    name: "cekjodoh",
    description: "Cek kecocokan antara dua orang",
    usage: ".cekjodoh @kamu @dia",
    cmd: ["cekjodoh"],
    isMedia: false,
    category: "game",
    async execute(sock, msg) {
        const jid = msg.key.remoteJid!;
        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        if (mentions.length < 2) {
            await sock.sendMessage(jid, { text: "Tag dua orang untuk dicek jodohnya.\nContoh: .cekjodoh @a @b" });
            return;
        }

        const score = Math.floor(Math.random() * 101);
        const [a, b] = mentions;

        await sock.sendMessage(jid, {
            text: `${score}% cocok antara @${a.split("@")[0]} dan @${b.split("@")[0]} ❤️`,
            mentions: [a, b]
        }, { quoted: msg });
    }
}
