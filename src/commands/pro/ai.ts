import { type Command } from "../../../types/Command";
import { bot } from "../../config/bot";
import UnexpectedError from "../../exceptions/UnexpectedError";
import { env } from "../../helpers/env";
import log from "../../utils/log";
import { t } from "../../utils/translate";
import { GoogleGenAI } from '@google/genai';

const gemini = new GoogleGenAI({ apiKey: env("GEMINI_API_KEY") });

export const ai: Command = {
    cmd: ["ai", "chat", "chatbot"],
    name: "ai",
    description: "Chat anything with AI",
    isAuth: true,
    execute: async (sock, msg, args, auth) => {
        try {
            const message = msg?.message?.conversation ||
                msg?.message?.extendedTextMessage?.text ||
                msg?.message?.imageMessage?.caption ||
                msg?.message?.videoMessage?.caption || "";
            const question = message.replace(bot.prefix, '');

            const remoteJid = msg.key.remoteJid!;
            const user = auth?.getUser(remoteJid);

            if (!question) {
                await sock.sendMessage(remoteJid, { text: await t("Please ask anything you want") });
                return;
            }

            const prompt = `kamu adalah ${bot.botName}, seorang chatbot yang diprogram oleh fian, kamu berperan untuk membalas pertanyaan apapun dari user, kamu memiliki sifat yang lucu seperti waifu di anime`;
            let completion;

            try {
                const response = await gemini.models.generateContent({
                    model: 'gemini-2.0-flash-001',
                    contents: question,
                    config: {
                        systemInstruction: prompt,
                        temperature: 0.8
                    }
                });

                completion = {
                    choices: [{ message: { content: response.text } }],
                };
            } catch (e: any) {
                if (e.status === 402) {
                    const response = await fetch("https://luminai.my.id/", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            prompt,
                            content: `[${user?.name || "--"}] ${message}`,
                            user: user?.phone || msg.key.remoteJid!,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(response.statusText);
                    }

                    const data = await response.json();

                    completion = {
                        choices: [{ message: { content: data.result } }],
                    };
                } else {
                    throw e;
                }
            }

            const text = completion.choices[0].message.content;

            if (!text) {
                await sock.sendMessage(remoteJid, { text: await t("Something went wrong") }, { quoted: msg });
                return;
            }

            await sock.sendMessage(remoteJid, { text }, { quoted: msg });
            log.info(`@${remoteJid} # ai generated!`);

        } catch (e: any) {
            console.error(e);
            throw new UnexpectedError(e.message);
        }
    }
}