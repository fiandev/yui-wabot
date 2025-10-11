import type { Command } from "types/Command"; // Sesuaikan path jika perlu
import axios from "axios";
import { t } from "@/utils/translate";

// PENTING: Ganti dengan base URL API Anda yang sebenarnya
const BASE_URL = "https://api.siputzx.my.id";

const getCommandText = (msg: import("@whiskeysockets/baileys").proto.IWebMessageInfo): string => {
  return msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
};

export const threads: Command = {
  name: "threads",
  cmd: ["threads"],
  category: "Stalker",
  description: "allows you to retrieve public profile information for a Threads user by providing their username as a query parameter. It scrapes data such as their ID, username, full name, biography, profile pictures (standard and HD), verification status, follower count, and external links in their bio. This is ideal for applications needing to display Threads user profiles or analyze public Threads data..",
  usage: "Usage: .threads <q>\nExample: .threads google",
  
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
    apiParams['q'] = mainQuery;

    // Parsing parameter tambahan (key=value)
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            const [key, ...valueParts] = parts[i].split('=');
            const value = valueParts.join('=').trim();
            if (key && value) {
                // Hanya masukkan parameter yang memang ada di dokumentasi API
                if (["q"].includes(key.trim())) {
                    apiParams[key.trim()] = value;
                }
            }
        }
    }

    try {      
      const searchParams = new URLSearchParams(apiParams);
      const url = `${BASE_URL}/api/stalk/threads?${searchParams.toString()}`;

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
      console.error("Error saat menjalankan command 'threads':", error);
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