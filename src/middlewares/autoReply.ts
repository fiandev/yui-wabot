import { type Middleware } from "../../types/Middleware";
import { bot } from "../config/bot";
import UnexpectedError from "../exceptions/UnexpectedError";
import log from "../utils/log";
import Authenticate from "../lib/Authenticate";

export const autoReply: Middleware = {
    name: "auto-reply",
    isAuth: true,
    execute: async (sock, msg) => {
        try {
            const auth = new Authenticate();

            const isBotCalled = /(yui(\s?chan)?)/gi.test(msg.message?.conversation || "");
            const fullMessage = msg.message?.conversation || "";
            const isWithPrefix = fullMessage.search(bot?.prefix) < 0;
            const user = auth?.getUser(msg.key.remoteJid!);
            const isGroup = msg.key.remoteJid!.endsWith("@g.us");

            if (msg.key.fromMe) return true;
            if (isWithPrefix) return true;

            let isChatRegistered = global.db.get("auto-reply-chats").includes(msg.key.remoteJid!);
            console.log({ isChatRegistered })

            if (!isChatRegistered) return true;

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

            // const catalog = await sock.getCatalog({ limit: 5 });
            let message = msg.message?.conversation || "";
            // let productList = catalog.products.length > 0 ? catalog.products.map((product, i) => `${i + 1}. ${product.name}`).join("\n") : "<product masih kosong>";
            let prompt = `kamu adalah yui, seorang chatbot yang diprogram oleh fian, kamu berperan untuk membalas pesan ketika fian sedang sibuk dan tidak bisa membalas pesan, kamu memiliki sifat yang lucu seperti waifu di anime`;

            if (msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) prompt = `pesan sebelumnya: ${msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation.slice(0, 30)}\n` + prompt

            const response = await fetch("https://luminai.my.id/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt,
                    content: `[${user?.name || "--"}] ${message}`,
                    user: user?.jid || msg.key.remoteJid!,
                }),
            });

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const data = await response.json();

            sock.sendMessage(msg.key.remoteJid!, { text: data.result }, { quoted: msg });
            log.info(`@${msg.key.remoteJid!} # auto response generated!`);

            return false;
        } catch (e: any) {
            console.error(e);
            throw new UnexpectedError(e.message);
        }
    },
};
