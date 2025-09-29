import { GoogleGenAI } from "@google/genai";
import { type Command } from "../../../types/Command";
import { bot } from "../../config/bot";
import { env } from "../../helpers/env";

const gemini = new GoogleGenAI({ apiKey: env("GEMINI_API_KEY") });

export const apakah: Command = {
    name: "apakah",
    description: "Prediksi untuk pertanyaan",
    usage: ".apakah <pertanyaan>",
    cmd: ["apakah"],
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

        const isFun = Math.random() < 0.5;

        let answer = "Yo ndak tau ko tanya saya";

        if (!isFun) {
            const response = await gemini.models.generateContent({
                model: 'gemini-2.0-flash-001',
                contents: question,
                config: {
                    temperature: 0.1
                }
            });
            if (response.text) {
                answer = response.text;
            }
        }

        if (isFun) {
            await sock.sendMessage(jid, {
                image: {
                    url: "https://media1.tenor.com/m/57XAx1F7PWwAAAAd/yntkts-ya-ndak-tau-kok-tanya-saya.gif",
                },
                gifPlayback: true,
                caption: `Pertanyaan: ${question}\nJawaban: ${answer}`
            }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, {
                text: `Pertanyaan: ${question}
Jawaban: 
${answer}`
            }, { quoted: msg });
        }
    }
}
