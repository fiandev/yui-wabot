import type { Command } from "types/Command"; // Sesuaikan path jika perlu
import axios from "axios";

// PENTING: Ganti dengan base URL API Anda yang sebenarnya
const BASE_URL = "https://api.siputzx.my.id";

const getCommandText = (msg: import("@whiskeysockets/baileys").proto.IWebMessageInfo): string => {
  return msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
};

export const ektp: Command = {
  name: "ektp",
  cmd: ["ektp"],
  category: "Maker",
  description: "This API generates a simulated Indonesian e-KTP (Kartu Tanda Penduduk) image based on the provided query parameters. Users can input various personal details such as province, city, NIK (National Identification Number), name, date of birth, gender, blood type, address, RT/RW, sub-district/village, district, religion, marital status, occupation, citizenship, validity period, issue date, and a URL for a passport-style photo. The API then renders these details onto an e-KTP template and returns the generated image as a PNG buffer. This tool is useful for creating mock e-KTP images for testing, development, or educational purposes, allowing developers to simulate real-world e-KTP data and visualize how it would appear on the card..",
  usage: "Usage: .ektp <provinsi> | kota=<value> | nik=<value> | nama=<value> | ttl=<value> | jenis_kelamin=<value> | golongan_darah=<value> | alamat=<value> | rt/rw=<value> | kel/desa=<value> | kecamatan=<value> | agama=<value> | status=<value> | pekerjaan=<value> | kewarganegaraan=<value> | masa_berlaku=<value> | terbuat=<value> | pas_photo=<value>\nExample: .ektp JAWA BARAT | kota=BANDUNG | nik=1234567890123456 | nama=John Doe | ttl=Bandung, 01-01-1990 | jenis_kelamin=contoh | golongan_darah=contoh | alamat=Jl. Contoh No. 123 | rt/rw=001/002 | kel/desa=Sukajadi | kecamatan=Sukajadi | agama=Islam | status=Belum Kawin | pekerjaan=Pegawai Swasta | kewarganegaraan=WNI | masa_berlaku=Seumur Hidup | terbuat=01-01-2023 | pas_photo=https://i.pinimg.com/736x/0b/9f/0a/0b9f0a92a598e6c22629004c1027d23f.jpg",
  
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
    apiParams['provinsi'] = mainQuery;

    // Parsing parameter tambahan (key=value)
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            const [key, ...valueParts] = parts[i].split('=');
            const value = valueParts.join('=').trim();
            if (key && value) {
                // Hanya masukkan parameter yang memang ada di dokumentasi API
                if (["provinsi","kota","nik","nama","ttl","jenis_kelamin","golongan_darah","alamat","rt/rw","kel/desa","kecamatan","agama","status","pekerjaan","kewarganegaraan","masa_berlaku","terbuat","pas_photo"].includes(key.trim())) {
                    apiParams[key.trim()] = value;
                }
            }
        }
    }

    try {
      await sock.sendMessage(msg.key.remoteJid!, { text: "⏳ Sedang memproses permintaan Anda..." }, { quoted: msg });
      
      const searchParams = new URLSearchParams(apiParams);
      const url = `${BASE_URL}/api/m/ektp?${searchParams.toString()}`;

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
      console.error("Error saat menjalankan command 'ektp':", error);
      const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan yang tidak terduga.";
      await sock.sendMessage(msg.key.remoteJid!, { text: `❌ Error: ${errorMessage}` }, { quoted: msg });
    }
  },
};