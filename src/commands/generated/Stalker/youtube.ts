import type { Command } from "types/Command"; // Sesuaikan path jika perlu
import axios from "axios";
import { t } from "@/utils/translate";

// PENTING: Ganti dengan base URL API Anda yang sebenarnya
const BASE_URL = "https://api.siputzx.my.id";

const getCommandText = (msg: import("@whiskeysockets/baileys").proto.IWebMessageInfo): string => {
  return msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
};

export const youtube: Command = {
  name: "youtube",
  cmd: ["youtube"],
  category: "Stalker",
  description: "allows you to retrieve public information about a YouTube channel and its latest five videos by providing a YouTube username as a query parameter. It fetches channel details such as username, display name, subscriber count, video count, avatar URL, channel URL, and description. For each of the latest videos, it provides the video ID, title, thumbnail, published time, view count, duration, and direct video URL. This is useful for applications or users wanting to get quick insights into a YouTube channel's content and statistics..",
  usage: "Usage: .youtube <username>\nExample: .youtube siputzx",
  
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
    apiParams['username'] = mainQuery;

    // Parsing parameter tambahan (key=value)
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            const [key, ...valueParts] = parts[i].split('=');
            const value = valueParts.join('=').trim();
            if (key && value) {
                // Hanya masukkan parameter yang memang ada di dokumentasi API
                if (["username"].includes(key.trim())) {
                    apiParams[key.trim()] = value;
                }
            }
        }
    }

    try {      
      const searchParams = new URLSearchParams(apiParams);
      const url = `${BASE_URL}/api/stalk/youtube?${searchParams.toString()}`;

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
      console.error("Error saat menjalankan command 'youtube':", error);
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