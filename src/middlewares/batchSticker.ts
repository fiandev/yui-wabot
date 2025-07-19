import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { Readable } from "stream";
import Sticker from "../lib/Sticker";
import type { Middleware } from "../../types/Middleware";

export const batchSticker: Middleware = {
    name: "batch-sticker",
    isAuth: false,
    execute: async (sock, msg) => {
        const isImage = !!msg.message?.imageMessage;
        const isVideo = !!msg.message?.videoMessage;
        const isSticker = !!msg.message?.stickerMessage;
        const jid = msg.key.remoteJid!;
        const batchModes = global.db.get("batchModes") || [];
        
        if (msg.key.fromMe || isSticker || !isImage && !isVideo || batchModes.includes(jid)) return true;
        
        const mediaStream = await downloadMediaMessage(
            msg,
            "stream",
            {},
            {
                reuploadRequest: sock.updateMediaMessage,
                logger: sock.logger,
            }
        );
        
        const stickerBuffer = await Sticker.convertToSticker(msg, mediaStream as Readable);

        await sock.sendMessage(msg.key.remoteJid!, {
            sticker: stickerBuffer,
        }, { quoted: msg });
        
        return true;
    }
}


