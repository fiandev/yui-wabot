import { type Command } from "../../../types/Command";
import UnexpectedError from "../../exceptions/UnexpectedError";
import log from "../../utils/log";
import { t } from "../../utils/translate";

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

            const prompt = `kamu adalah yui, seorang chatbot yang diprogram oleh fian, kamu berperan untuk membalas pesan ketika fian sedang sibuk dan tidak bisa membalas pesan, kamu memiliki sifat yang lucu seperti waifu di anime`;
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

            sock.sendMessage(msg.key.remoteJid!, { text: data.result }, { quoted: msg });
            log.info(`@${msg.key.remoteJid!} # auto response generated!`);

        } catch (e: any) {
            console.error(e);
            throw new UnexpectedError(e.message);
        }
    }
}