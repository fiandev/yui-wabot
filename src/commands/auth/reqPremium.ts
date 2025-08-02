import type { Command } from "../../../types/Command";
import { senderIdentity } from "../../utils/senderIdentity";
import { bot } from "../../config/bot";

export const reqPremium: Command = {
    name: "req-premium",
    description: "Execute command",
    cmd: ["req-premium", "req-prem", "reqp"],
    isAuth: true,
    category: "auth",
    execute: async (sock, msg, args) => {
        try {
            const user = senderIdentity(msg);
            const message = `Hi ${user.name}
Ikuti langkah berikut:

1. Transfer sebesar Rp 10.000 ke beberapa metode berikut:
- Dana: ${bot.botNumber}
- BTC: ${bot.botBtcAddress} \`0.0000027\`
- USDt: 0x93df9D225F4E396A6899Fad46bEA72B88990B686 \`$0.6\`
2. Kirim bukti transfer ke saya
3. Setelah saya menerima bukti transfer, kamu akan menjadi premium

Terima kasih!`;

            await sock.sendMessage(msg.key.remoteJid!, { text: message }, { quoted: msg });
        } catch (err) {
            console.log(err);
        }
    }
}   