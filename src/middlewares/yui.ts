import { type Middleware } from "../../types/Middleware";
import { bot } from "../config/bot";
import UnexpectedError from "../exceptions/UnexpectedError";
import log from "../utils/log";
import Authenticate from "../lib/Authenticate";
import OpenAI from "openai";
import { env } from "../helpers/env";
import { t } from "../utils/translate";
import { senderIdentity } from "../utils/senderIdentity";
import { fa } from "zod/v4/locales";
import type { ChatCompletion } from "openai/resources/index.mjs";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";

const getPhoneNumberFromJid = (jid: string | undefined): string => {
  if (!jid) return '';
  // Menghapus ID Pesan (misal: :83@s.whatsapp.net) dan mengambil bagian Nomor Telepon
  const [partWithoutSuffix] = jid.split(':');
  return partWithoutSuffix.split('@')[0];
};


export const yui: Middleware = {
  name: "yui",
  isAuth: false,
  execute: async (sock, msg) => {
    try {
      const message =
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        msg?.message?.imageMessage?.caption ||
        msg?.message?.videoMessage?.caption ||
        "";
      const user = senderIdentity(msg);
      const remoteJid = msg.key.remoteJid!;

      const fullMessage = `${user?.name || "user"}: ${message.replace(bot.prefix, "")}`;
      const isBotCalled = /(yui(\s?chan)?)/gi.test(fullMessage);
      const isGroup = msg.key.remoteJid!.endsWith("@g.us");

      const isImageMessage = !!msg.message?.imageMessage;
      const isQuotedImage = !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      const isMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(sock.user?.id!) || msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user?.id;

      const imageSource = isImageMessage
        ? msg?.message?.imageMessage
        : isQuotedImage
          ? msg.message!.extendedTextMessage!.contextInfo!.quotedMessage!.imageMessage
          : null;

      const isImage = !!imageSource;
      let base64ImageUrl = ""; // Variabel baru untuk menampung string Base64

      if (isImage && imageSource) {
        try {
          const stream = await downloadContentFromMessage(imageSource as any, 'image');

          let buffer = Buffer.from([]);
          for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
          }

          // Konversi ke Base64 dengan prefix MIME Type yang benar (asumsi JPEG)
          const base64Image = buffer.toString('base64');
          base64ImageUrl = `data:image/jpeg;base64,${base64Image}`;

        } catch (e) {
          console.error("Gagal mengunduh dan konversi gambar ke Base64:", e);
          await sock.sendMessage(
            remoteJid,
            { text: await t("Gagal memproses gambar. URL gambar mungkin tidak valid atau kedaluwarsa.") },
            { quoted: msg }
          );
          return false;
        }
      }


      if (msg.key.fromMe) return true;

      if (isGroup) {
        console.log({ isGroup, isBotCalled, isMentioned })

        // skip if not replied or not called
        if (
          !isMentioned &&
          !isBotCalled
        )
          return true;
      }

      if (
        !isBotCalled &&
        !isGroup &&
        !msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(
          sock.user?.id!,
        )
      )
        return true;

      let prompt = `kamu adalah ${bot.botName}, seorang chatbot / assisten, kamu memiliki sifat yang lucu seperti waifu di anime, gunakan emoji untuk mengekspresikan emosi`;
      let conversations: any[] = [
        // 1. System Role
        { role: "system", content: prompt },
      ];

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: env("ROUTER_AI_APIKEY"),
        defaultHeaders: {
          "HTTP-Referer": "yui.fiandev.com", // Optional. Site URL for rankings on openrouter.ai.
          "X-Title": "Yui Wabot", // Optional. Site title for rankings on openrouter.ai.
        },
      });


      const quotedMessageContent =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption ||
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage?.caption ||
        null;

      if (
        quotedMessageContent
      ) {
        conversations.push({
          role: "user",
          content: quotedMessageContent,
        });
      }

      const userMessageContent = isImage
        ? [
          { type: 'text', text: fullMessage },
          {
            type: 'image_url',
            image_url: {
              url: base64ImageUrl, // <<< GUNAKAN BASE64 STRING DI SINI
            },
          },
        ]
        : [
          { type: 'text', text: fullMessage }
        ];

      conversations.push({
        role: "user",
        content: userMessageContent,
      });

      let completion: ChatCompletion;

      log.info(`[${isImage ? "Image" : "Text"}]: ${isImage ? base64ImageUrl.slice(0, 20) : fullMessage}`);

      try {
        await sock.sendMessage(
          remoteJid,
          {
            react: {
              text: "🤨"
            }
          },
          { quoted: msg },
        )
        completion = await openai.chat.completions.create({
          messages: conversations,
          model: isImage ? "mistralai/mistral-small-3.2-24b-instruct:free" : "deepseek/deepseek-chat-v3.1:free",
        });

        await sock.sendMessage(
          remoteJid,
          {
            react: {
              text: "✅"
            }
          },
          { quoted: msg },
        )

      } catch (e: any) {
        let text = await t("Can't connect AI right now, please contact owner");
        await sock.sendMessage(
          remoteJid,
          { text: `${text}, ${e.message}` },
          { quoted: msg },
        );
        return false;
      }

      if (!completion) {
        let text = await t("Can't connect AI right now, please contact owner");
        await sock.sendMessage(
          remoteJid,
          { text: `${text}` },
          { quoted: msg },
        );
        return false;
      }

      const text = completion.choices[0].message.content?.replace(
        "<｜begin▁of▁sentence｜>", ""
      )

      if (!text) {
        await sock.sendMessage(
          remoteJid,
          { text: await t("Something went wrong") },
          { quoted: msg },
        );
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
