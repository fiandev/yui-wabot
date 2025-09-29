import { type Command } from "../../types/Command";
import { bot } from "../config/bot";
import UnexpectedError from "../exceptions/UnexpectedError";
import Sticker from "../lib/Sticker";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { Readable } from "stream";
import { Sticker as StickerFormatter } from "wa-sticker-formatter"; // Import pustaka baru

export const sticker: Command = {
  name: "sticker",
  description: "create sticker",
  cmd: ["sticker", "s", "st"],
  // isMedia: true,
  category: "tools",
  async execute(sock, msg) {

    try {
      let isImage: any = msg.message?.imageMessage;
      let isVideo: any = msg.message?.videoMessage;

      const quoted =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (quoted) {
        isImage = (quoted?.imageMessage?.mimetype?.search ? ("image") : "") || false;
        isVideo = (quoted?.imageMessage?.mimetype?.search ? ("video") : "") || false;
      }

      if (!isImage && !isVideo) {
        await sock.sendMessage(msg.key.remoteJid!, {
          text: "Kirim gambar/video atau reply ke media dengan *.sticker*",
        });
        return;
      }

      const messageToProcess = quoted ? { key: msg.message!.extendedTextMessage!.contextInfo!.stanzaId, message: quoted } : msg;
      const mediaStream = await downloadMediaMessage(
        messageToProcess as any,
        "stream",
        {},
        {
          reuploadRequest: sock.updateMediaMessage,
          logger: sock.logger,
        }
      );
      const stickerBuffer = await Sticker.convertToSticker(msg, mediaStream as Readable);

      const stickerWithExif = new StickerFormatter(stickerBuffer, {
        pack: bot.botName,
        author: bot.authorName,
        type: 'default', // atau 'default', 'crop'
        quality: 100,
      });
      await sock.sendMessage(msg.key.remoteJid!, {
        sticker: await stickerWithExif.toBuffer(),
      }, { quoted: msg });

    } catch (error: any) {
      console.error(error)
      throw new UnexpectedError(error?.message || "sticker error");

    }

  },
};