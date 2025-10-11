import type { Command } from "types/Command"; // Sesuaikan path jika perlu
import axios from "axios";
import { t } from "@/utils/translate";

// PENTING: Ganti dengan base URL API Anda yang sebenarnya
const BASE_URL = "https://api.siputzx.my.id";

const getCommandText = (msg: import("@whiskeysockets/baileys").proto.IWebMessageInfo): string => {
  return msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
};

export const gemini: Command = {
  name: "gemini",
  cmd: ["yapping"],
  category: "AI",
  description: "provides a BETA version interface to interact with the Gemini AI model using GET requests. Users can send text prompts, along with optional system prompts, image URLs, and conversation context (conversationID, responseID, choiceID) to maintain continuity in dialogue. A valid Google Gemini authentication cookie is required for access. This endpoint is designed for experimental use and can be utilized for advanced AI interactions, including multimodal inputs (text and image) and stateful conversations. The response includes the AI's answer and additional metadata for conversation tracking and potential multimedia outputs..",
  usage: "Usage: .gemini <text> | cookie=<value> | promptSystem=<value> | imageUrl=<value> | conversationID=<value> | responseID=<value> | choiceID=<value>\nExample: .gemini Explain quantum physics simply. | cookie=contoh | promptSystem=Act as a professional physicist. | imageUrl=https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Quantum_mechanics_model.svg/1200px-Quantum_mechanics_model.svg.png | conversationID=contoh | responseID=contoh | choiceID=contoh",

  async execute(sock, msg) {
    const fullArgs = getCommandText(msg).slice(this.name.length + 2).trim();
    const remoteJid = msg.key.remoteJid!;

    // Logika baru untuk mem-parsing banyak argumen
    const apiParams: Record<string, string> = {};
    const parts = fullArgs.split('|').map(p => p.trim());

    // Parameter pertama selalu untuk parameter utama
    const mainQuery = parts[0];
    if (!mainQuery) {
      await sock.sendMessage(msg.key.remoteJid!, { text: this.usage! }, { quoted: msg });
      return;
    }
    apiParams['text'] = mainQuery;

    // Parsing parameter tambahan (key=value)
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        const [key, ...valueParts] = parts[i].split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          // Hanya masukkan parameter yang memang ada di dokumentasi API
          if (["text", "cookie", "promptSystem", "imageUrl", "conversationID", "responseID", "choiceID"].includes(key.trim())) {
            apiParams[key.trim()] = value;
          }
        }
      }
    }

    try {
      const searchParams = new URLSearchParams(apiParams);
      const url = `${BASE_URL}/api/ai/gemini?${searchParams.toString()}`;

      await sock.sendMessage(
        remoteJid,
        {
          react: {
            text: "⏳"
          }
        },
        { quoted: msg },
      )
      const { data } = await axios.get(url);

      let resultText = "";
      if (typeof data === 'object' && data !== null) {
        const potentialKeys = ['result', 'data', 'message', 'answer', 'response', 'content'];
        const responseKey = Object.keys(data).find(k => potentialKeys.includes(k.toLowerCase()));
        let result = responseKey ? data[responseKey] : JSON.stringify(data, null, 2);

        if (typeof result === 'string') {
          resultText = result;
        } else {
          resultText = JSON.stringify(result, null, 2);
        }
      } else {
        resultText = String(data);
      }

      console.log({ resultText, data });
      if (!resultText || resultText.trim() === '{}' || resultText.trim() === '[]') {
        throw new Error(await t("Request failed, please contact owner"));
      }

      await sock.sendMessage(
        remoteJid,
        {
          react: {
            text: "✅"
          }
        },
        { quoted: msg },
      )
      await sock.sendMessage(msg.key.remoteJid!, { text: resultText }, { quoted: msg });

    } catch (error: any) {
      console.error("Error saat menjalankan command 'gemini':", error);
      const errorMessage = await t("Request failed, please contact owner");

      await sock.sendMessage(
        remoteJid,
        {
          react: {
            text: "😭"
          }
        },
      )
      await sock.sendMessage(remoteJid, { text: `Error: ${errorMessage}` }, { quoted: msg });
    }
  },
};