import type { Command } from "../../../types/Command";
import Authenticate from "../../lib/Authenticate";
import { t } from "../../utils/translate";

const PHONE_EXP = /^[0-9]{10,15}$/;

export const removePremium: Command = {
    name: "remove-premium",
    description: "Premium command",
    cmd: ["remove-premium", "remove-prem", "reprem"],
    isOnlyOwner: true,
    category: "sudo",
    execute: async (sock, msg, args) => {
        let phones = args?.[0]?.split(",")
            .map((phone: string) => phone.trim())
            .filter((phone: string) => PHONE_EXP.test(phone)) || [];

        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.map((jid: string) => jid.split("@")[0])
            .toString()
            .split(PHONE_EXP)
            .map((phone: string) => phone.trim())
            .filter((phone: string) => PHONE_EXP.test(phone)) || [];

        if (!phones && !mentions) {
            await sock.sendMessage(msg.key.remoteJid!, { text: await t("Please provide phone number or mentions") }, { quoted: msg });
            return;
        }

        phones = [...phones, ...mentions];

        db.set("premiums", db.get("premiums")?.filter((phone: string) => !phones.includes(phone)) || []);
        await sock.sendMessage(msg.key.remoteJid!, { text: await t("Some of you're now premium.") }, { quoted: msg });
    }
}

