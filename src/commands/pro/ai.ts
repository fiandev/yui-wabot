import { type Command } from "../../../types/Command";
import { bot } from "../../config/bot";
import UnexpectedError from "../../exceptions/UnexpectedError";
import { env } from "../../helpers/env";
import log from "../../utils/log";
import { t } from "../../utils/translate";
import OpenAI from "openai";

export const ai: Command = {
    cmd: ["ai", "chat", "chatbot"],
    name: "ai",
    description: "Chat anything with AI",
    isAuth: true,
    execute: async (sock, msg, args, auth) => {
        try {
            const message = args?.[0];
            const remoteJid = msg.key.remoteJid!;
            const user = auth?.getUser(remoteJid);

            if (!message) {
                await sock.sendMessage(remoteJid, { text: await t("Please provide a message") });
                return;
            }

            const prompt = `kamu adalah ${bot.botName}, seorang chatbot yang diprogram oleh fian, kamu berperan untuk membalas pesan ketika fian sedang sibuk dan tidak bisa membalas pesan, kamu memiliki sifat yang lucu seperti waifu di anime`;
            const openai = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey: env("DEEPSEEK_APIKEY")
            });

            let completion;

            try {
                completion = await openai.chat.completions.create({
                    messages: [{ role: "system", content: prompt }, { role: "user", content: message }],
                    model: "deepseek-chat",
                });
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