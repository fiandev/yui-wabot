import type { Command } from "../../../types/Command";
import qrcode from "qr-image";

export const qrGenerate: Command = {
    name: "qr-generate",
    description: "Generate QR code",
    cmd: ["qr-generate", "qr", "qrg"],
    usage: ".qr <text>",
    isAuth: true,
    category: "tools",
    execute: async (sock, msg, args) => {
        try {
            const text = args?.[0];

            if (!text) {
                await sock.sendMessage(msg.key.remoteJid!, { text: "Please provide text" }, { quoted: msg });
                return;
            }

            let qr = qrcode.imageSync(text, { type: 'png' });
            let buffer = Buffer.from(qr) as any;
            let caption = `QR Code for: ${text}`;
            await sock.sendMessage(msg.key.remoteJid!, { image: buffer, caption }, { quoted: msg });
        } catch (err) {
            console.log(err);
            await sock.sendMessage(msg.key.remoteJid!, { text: "An error occurred while trying to execute the command. Please try again." }, { quoted: msg });
        }
    }
}