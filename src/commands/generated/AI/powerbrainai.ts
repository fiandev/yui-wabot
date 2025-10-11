import type { Command } from "types/Command"; // Sesuaikan path jika perlu
import axios from "axios";
import { t } from "@/utils/translate";

// PENTING: Ganti dengan base URL API Anda yang sebenarnya
const BASE_URL = "https://api.siputzx.my.id";

const getCommandText = (msg: import("@whiskeysockets/baileys").proto.IWebMessageInfo): string => {
  return msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
};

export const powerbrainai: Command = {
  name: "powerbrainai",
  cmd: ["powerbrainai"],
  category: "AI",
  description: "allows users to get AI-powered responses from 'PowerBrain AI' by submitting a text query via a URL parameter. It's designed for quick integrations where AI conversational capabilities are needed, such as chatbots, virtual assistants, or quick information retrieval systems. The 'query' parameter is mandatory and should contain the text you want PowerBrain AI to process. The API will return PowerBrain AI's generated response..",
  usage: "Usage: .powerbrainai <query>\nExample: .powerbrainai Tell me about the history of artificial intelligence.",
  
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
    apiParams['query'] = mainQuery;

    // Parsing parameter tambahan (key=value)
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            const [key, ...valueParts] = parts[i].split('=');
            const value = valueParts.join('=').trim();
            if (key && value) {
                // Hanya masukkan parameter yang memang ada di dokumentasi API
                if (["query"].includes(key.trim())) {
                    apiParams[key.trim()] = value;
                }
            }
        }
    }

    try {      
      const searchParams = new URLSearchParams(apiParams);
      const url = `${BASE_URL}/api/ai/powerbrainai?${searchParams.toString()}`;

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
        throw new Error( await t("Request failed, please contact owner"));
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
      console.error("Error saat menjalankan command 'powerbrainai':", error);
      const errorMessage = await t("Request failed, please contact owner");
      await sock.sendMessage(
        remoteJid,
        {
          react: {
            text: "😭"
          }
        },
        { quoted: msg },
      )
      await sock.sendMessage(msg.key.remoteJid!, { text: `❌ Error: ${errorMessage}` }, { quoted: msg });
    }
  },
};