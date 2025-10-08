import type { Command } from "types/Command"; // Sesuaikan path jika perlu
import axios from "axios";

// PENTING: Ganti dengan base URL API Anda yang sebenarnya
const BASE_URL = "https://api.siputzx.my.id";

const getCommandText = (msg: import("@whiskeysockets/baileys").proto.IWebMessageInfo): string => {
  return msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
};

export const musicapple: Command = {
  name: "musicapple",
  cmd: ["musicapple"],
  category: "Downloader",
  description: "allows users to retrieve music download links and SEO (Search Engine Optimization) data directly from an Apple Music URL. It functions by scraping the provided Apple Music page to extract relevant information such as song title, artist, album artwork, and metadata like page title, description, and keywords. This is useful for applications that need to integrate music download capabilities or display detailed information about Apple Music tracks. The API handles the complexities of CSRF tokens and Cloudflare Turnstile CAPTCHA to ensure successful data retrieval. Users provide the Apple Music URL as a query parameter..",
  usage: "Usage: .musicapple <url>\nExample: .musicapple https://music.apple.com/id/album/duka/1160727993?i=1160728286",
  
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
    apiParams['url'] = mainQuery;

    // Parsing parameter tambahan (key=value)
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            const [key, ...valueParts] = parts[i].split('=');
            const value = valueParts.join('=').trim();
            if (key && value) {
                // Hanya masukkan parameter yang memang ada di dokumentasi API
                if (["url"].includes(key.trim())) {
                    apiParams[key.trim()] = value;
                }
            }
        }
    }

    try {
      await sock.sendMessage(msg.key.remoteJid!, { text: "⏳ Sedang memproses permintaan Anda..." }, { quoted: msg });
      
      const searchParams = new URLSearchParams(apiParams);
      const url = `${BASE_URL}/api/d/musicapple?${searchParams.toString()}`;

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
      console.error("Error saat menjalankan command 'musicapple':", error);
      const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan yang tidak terduga.";
      await sock.sendMessage(msg.key.remoteJid!, { text: `❌ Error: ${errorMessage}` }, { quoted: msg });
    }
  },
};