import { type Command } from "../../types/Command";
import Sticker from "../lib/Sticker";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { Readable } from "stream";

export const sticker: Command = {
  name: "sticker",
  description: "Deskripsi sticker",
  cmd: ["sticker", "s", "st"],
  isMedia: true,
  async execute(sock, msg) {
    const isImage = !!msg.message?.imageMessage;
    const isVideo = !!msg.message?.videoMessage;

    if (!isImage && !isVideo) {
      await sock.sendMessage(msg.key.remoteJid!, {
        text: "Kirim gambar/video atau reply ke media dengan *!sticker*",
      });
      return;
    }

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
  },
};