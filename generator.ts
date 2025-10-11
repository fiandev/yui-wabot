const fs = require('fs');
const path = require('path');

// --- KONFIGURASI ---
const API_DOCS_FILE = './api.get.json'; // Atau './api-post.json'
// Direktori tempat file command akan dibuat
const OUTPUT_DIR = path.join(__dirname, 'src', 'commands', 'generated');
// -----------------

const toCamelCase = (str: string) => {
  return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase()).replace(/-/g, '');
};

/**
 * Menghasilkan konten file command, sekarang dengan dukungan multi-parameter.
 */
const createCommandFileContent = (apiData: Record<string, any>) => {
  const { path: apiPath, description, category, parameters } = apiData;

  if (!parameters || parameters.length === 0) {
    console.warn(`[!] Skipping ${apiPath}: No parameters found.`);
    return null;
  }

  // Identifikasi parameter utama (wajib) dan parameter lainnya (opsional)
  const mainParam = parameters.find((p: Record<string, any>) =>
    ['q', 'query', 'content', 'text', 'prompt', 'keyword', 'question'].includes(p.name)
  ) || parameters[0]; // Jika tidak ada, anggap parameter pertama sebagai yang utama

  const otherParams = parameters.filter((p: Record<string, any>) => p.name !== mainParam.name);

  let commandName = apiPath.split('/').pop();
  if (!commandName) return null;
  commandName = toCamelCase(commandName);

  if (/^(\d+)/.test(commandName)) {
    commandName = commandName.replace(/^(\d+)/, `_$1`);
  }

  commandName = commandName.replace(/(\W+)/g, `_`);


  // Membuat string usage yang baru dan lebih deskriptif
  let usage = `Usage: .${commandName} <${mainParam.name}>`;
  let example = `Example: .${commandName} ${mainParam.example || 'input utama'}`;

  if (otherParams.length > 0) {
    const otherParamsUsage = otherParams.map((p: Record<string, any>) => `| ${p.name}=<value>`).join(' ');
    usage += ` ${otherParamsUsage}`;
    const otherParamsExample = otherParams.map((p: Record<string, any>) => `| ${p.name}=${p.example || 'contoh'}`).join(' ');
    example += ` ${otherParamsExample}`;
  }

  const fullUsage = `${usage}\n${example}`;

  // Definisikan semua nama parameter untuk digunakan di template
  const allParamNames = JSON.stringify(parameters.map((p: Record<string, any>) => p.name));

  return `
import type { Command } from "types/Command"; // Sesuaikan path jika perlu
import axios from "axios";
import { t } from "@/utils/translate";

// PENTING: Ganti dengan base URL API Anda yang sebenarnya
const BASE_URL = "https://api.siputzx.my.id";

const getCommandText = (msg: import("@whiskeysockets/baileys").proto.IWebMessageInfo): string => {
  return msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
};

export const ${commandName}: Command = {
  name: "${commandName}",
  cmd: ["${commandName}"],
  category: "${category}",
  description: "${description.replace(/"/g, '\\"').replace("This API endpoint ", "")}.",
  usage: "${fullUsage.replace(/\n/g, '\\n').replace(/"/g, '\\"')}",
  
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
    apiParams['${mainParam.name}'] = mainQuery;

    // Parsing parameter tambahan (key=value)
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            const [key, ...valueParts] = parts[i].split('=');
            const value = valueParts.join('=').trim();
            if (key && value) {
                // Hanya masukkan parameter yang memang ada di dokumentasi API
                if (${allParamNames}.includes(key.trim())) {
                    apiParams[key.trim()] = value;
                }
            }
        }
    }

    try {      
      const searchParams = new URLSearchParams(apiParams);
      const url = \`\${BASE_URL}${apiPath}?\${searchParams.toString()}\`;

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
      console.error("Error saat menjalankan command '${commandName}':", error);
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
      await sock.sendMessage(msg.key.remoteJid!, { text: \`❌ Error: \${errorMessage}\` }, { quoted: msg });
    }
  },
};
`;
};

/**
 * Fungsi utama untuk menjalankan generator.
 */
function main() {
  console.log("🚀 Memulai proses pembuatan command...");
  if (!fs.existsSync(API_DOCS_FILE)) {
    console.error(`❌ Error: File dokumentasi API tidak ditemukan di '${API_DOCS_FILE}'.`);
    return;
  }
  const apiDocs = JSON.parse(fs.readFileSync(API_DOCS_FILE, 'utf-8'));
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  let generatedCount = 0;
  for (const category in apiDocs) {
    if (Array.isArray(apiDocs[category])) {
      const categoryDir = path.join(OUTPUT_DIR, category);
      if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir);
      apiDocs[category].forEach(endpoint => {
        const fileContent = createCommandFileContent({ ...endpoint, category });
        if (fileContent) {
          const commandName = toCamelCase(endpoint.path.split('/').pop() || '');
          const filePath = path.join(categoryDir, `${commandName}.ts`);
          fs.writeFileSync(filePath, fileContent.trim());
          console.log(`✅ Berhasil membuat file: ${filePath}`);
          generatedCount++;
        }
      });
    }
  }
  console.log(`\n✨ Selesai! Total ${generatedCount} file command berhasil dibuat.`);
}

main();