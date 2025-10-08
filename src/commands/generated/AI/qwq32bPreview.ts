import type { Command } from "types/Command"; // Sesuaikan path jika perlu
import axios from "axios";

// PENTING: Ganti dengan base URL API Anda yang sebenarnya
const BASE_URL = "https://api.siputzx.my.id";

const getCommandText = (msg: import("@whiskeysockets/baileys").proto.IWebMessageInfo): string => {
  return msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
};

export const qwq32bPreview: Command = {
  name: "qwq32bPreview",
  cmd: ["qwq32bPreview"],
  category: "AI",
  description: "provides access to the Qwen QwQ 32B Preview AI model, allowing users to generate responses by providing text content via query parameters. It's suitable for various natural language processing tasks, including creative writing, summarization, and conversational AI. The API requires a 'content' parameter, which should be the input text for the AI. Upon successful execution, it will return the AI's generated response..",
  usage: "Usage: .qwq32bPreview <content>\nExample: .qwq32bPreview Tell me about the history of computers.",
  
  async execute(sock, msg) {
    const fullArgs = getCommandText(msg).slice(this.name.length + 2).trim();
    
    // Logika baru untuk mem-parsing banyak argumen
    const apiParams: Record<string, string> = {};
    const parts = fullArgs.split('|').map(p => p.trim());

    // Parameter pertama selalu untuk parameter utama
    const mainQuery = parts[0];
    if (!mainQuery) {
      await sock.sendMessage(msg.key.remoteJid!, { text: this.usage! }, { quoted: msg });
      return;
    }
    apiParams['content'] = mainQuery;

    // Parsing parameter tambahan (key=value)
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            const [key, ...valueParts] = parts[i].split('=');
            const value = valueParts.join('=').trim();
            if (key && value) {
                // Hanya masukkan parameter yang memang ada di dokumentasi API
                if (["content"].includes(key.trim())) {
                    apiParams[key.trim()] = value;
                }
            }
        }
    }

    try {
      await sock.sendMessage(msg.key.remoteJid!, { text: "⏳ Sedang memproses permintaan Anda..." }, { quoted: msg });
      
      const searchParams = new URLSearchParams(apiParams);
      const url = `${BASE_URL}/api/ai/qwq-32b-preview?${searchParams.toString()}`;

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
        throw new Error("API memberikan respons kosong atau tidak valid.");
      }

      await sock.sendMessage(msg.key.remoteJid!, { text: resultText }, { quoted: msg });

    } catch (error: any) {
      console.error("Error saat menjalankan command 'qwq32bPreview':", error);
      const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan yang tidak terduga.";
      await sock.sendMessage(msg.key.remoteJid!, { text: `❌ Error: ${errorMessage}` }, { quoted: msg });
    }
  },
};