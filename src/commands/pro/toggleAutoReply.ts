import { type Command } from "../../../types/Command";
import UnexpectedError from "../../exceptions/UnexpectedError";
import log from "../../utils/log";
import { t } from "../../utils/translate";

export const toggleAutoReply: Command = {
    cmd: ["toggle-auto-reply", "auto-reply", "autoreply", "toggleautoreply"],
    name: "toggle-auto-reply",
    description: "Toggle auto reply",
    isAuth: true,
    execute: async (sock, msg) => {
        try {
            const remoteJid = msg.key.remoteJid!;
            const sender = msg.key.id!;
            const isGroup = remoteJid.endsWith("@g.us");

            if (isGroup) {
                const members = await sock.groupMetadata(remoteJid);
                const isAdmin = members?.participants?.find((v: any) => v.jid === sender)?.isAdmin || false;

                if (!isAdmin) {
                    await sock.sendMessage(remoteJid, { text: await t("You are not admin, go ahead!") }, { quoted: msg });
                    return;
                }
            }

            let autoReplyChats = global.db.get("auto-reply-chats", []);
            let isChatRegistered = autoReplyChats.includes(msg.key.remoteJid!);

            if (isChatRegistered) {
                console.log(autoReplyChats.filter((v: string) => v !== msg.key.remoteJid!))
                global.db.set("auto-reply-chats", autoReplyChats.filter((v: string) => v !== msg.key.remoteJid!));
                await sock.sendMessage(remoteJid, { text: await t("Auto reply disabled") }, { quoted: msg });
                log.info(`@${remoteJid} # auto reply disabled!`);
            } else {
                global.db.set("auto-reply-chats", [...autoReplyChats, msg.key.remoteJid!]);
                console.log([...autoReplyChats, msg.key.remoteJid!])
                await sock.sendMessage(remoteJid, { text: await t("Auto reply enabled") }, { quoted: msg });
                log.info(`@${remoteJid} # auto reply enabled!`);

            }

        } catch (e: any) {
            console.error(e);
            throw new UnexpectedError(e.message);
        }
    }
}