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
            const isBotCalled = /(yui(\s?chan)?)/gi.test(msg.message?.conversation || "");
            const fullMessage = msg.message?.conversation || "";
            const isWithPrefix = fullMessage.search(bot?.prefix) < 0;
            const isGroup = msg.key.remoteJid!.endsWith("@g.us");
            const user = senderIdentity(msg);

            if (msg.key.fromMe) return true;
            if (isWithPrefix) return true;

            // let isChatRegistered = global.db.get("auto-reply-chats").includes(msg.key.remoteJid!);
            // console.log({ isChatRegistered })

            // if (!isChatRegistered) return true;
            if (isGroup) {
                let sender = msg.key.participant?.split("@")[0] || "--";
                let jid = sock.user?.id || "";

                /**
                 * please don't touch it !!
                 * this logic will skip this middleware :
                 * 1. when chatbot not mentioned
                 * 2. when message from chatbot not replied
                 * 3. when chatbot name not typed on the conversetion
                 */
                if (jid.search(sender) < 0 && !msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(jid) && !isBotCalled) return true;
            }

            // skip when not replied or not called
            if (!msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(sock.user?.id!) || !isBotCalled) {
                return true;
            }

            const remoteJid = msg.key.remoteJid!;

            let prompt = `kamu adalah ${bot.botName}, seorang chatbot yang diprogram oleh fian, kamu berperan untuk membalas pesan ketika fian sedang sibuk dan tidak bisa membalas pesan, kamu memiliki sifat yang lucu seperti waifu di anime`;

            if (msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) prompt = `pesan sebelumnya: ${msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation.slice(0, 30)}\n` + prompt
            const message = msg.message?.conversation || "";

            const openai = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey: env("DEEPSEEK_APIKEY")
            });

            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: prompt },
                    { role: "user", content: `${user.name}: ${message}` }
                ],
                model: "deepseek-chat",
            });

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
