import { type Middleware } from "../../types/Middleware";
import { bot } from "../config/bot";
import UnexpectedError from "../exceptions/UnexpectedError";
import log from "../utils/log";
import Authenticate from "../lib/Authenticate";
import OpenAI from "openai";
import { env } from "../helpers/env";
import { t } from "../utils/translate";
import { senderIdentity } from "../utils/senderIdentity";

export const autoReply: Middleware = {
    name: "auto-reply",
    isAuth: true,
    execute: async (sock, msg) => {
        try {
            const fullMessage = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            const isBotCalled = /(yui(\s?chan)?)/gi.test(fullMessage);
            const isGroup = msg.key.remoteJid!.endsWith("@g.us");
            const user = senderIdentity(msg);

            if (msg.key.fromMe) return true;

            if (isGroup) {
                let sender = msg.key.participant?.split("@")[0] || "--";
                let jid = sock.user?.id || "";

                // skip if not replied or not called
                if (jid.search(sender) < 0 && !msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(jid) && !isBotCalled) return true;
            }

            if (!isBotCalled && !isGroup && !msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(sock.user?.id!)) return true;

            const remoteJid = msg.key.remoteJid!;

            let prompt = `kamu adalah ${bot.botName}, seorang chatbot yang diprogram oleh fian, kamu berperan untuk membalas pesan ketika fian sedang sibuk dan tidak bisa membalas pesan, kamu memiliki sifat yang lucu seperti waifu di anime`;

            if (msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) prompt = `pesan sebelumnya: ${msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation.slice(0, 30)}\n` + prompt
            const message = msg.message?.conversation || "";

            const openai = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey: env("DEEPSEEK_APIKEY")
            });

            let completion;
            try {
                completion = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: prompt },
                        { role: "user", content: `${user.name}: ${message}` }
                    ],
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
                            content: `[${user.name || "--"}] ${message}`,
                            user: user.phone || msg.key.remoteJid!,
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
                return false;
            }

            await sock.sendMessage(remoteJid, { text }, { quoted: msg });
            log.info(`@${remoteJid} # ai generated!`);

            return true;
        } catch (e: any) {
            console.error(e);
            throw new UnexpectedError(e.message);
        }
    },
};
