import { type Command } from "../../../types/Command";
import UnexpectedError from "../../exceptions/UnexpectedError";
import { calculateShareholderDistribution, type CompanyData } from "../../helpers/stock-analyser";
import { t } from "../../utils/translate";
import { getJsonWithPuppeteer } from "../tools/browser";

// --- MODIFIKASI COMMAND EXECUTE ---
export const stockProfile: Command = {
    cmd: ["profile-emiten", "stock-profile", "stockp"],
    name: "stock-profile",
    description: "Stock Profile Analyser",
    isAuth: true,
    execute: async (sock, msg, args, auth) => {
        try {
            const ticker = args?.[0];
            const remoteJid = msg.key.remoteJid!;

            if (!ticker) {
                await sock.sendMessage(remoteJid, { text: await t("Please provide stock ticker") });
                return;
            }

            const endpoint = `https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${ticker?.toUpperCase()}&language=id-id`

            // --- PENGGUNAAN PROXY DI SINI ---
            const data: CompanyData = JSON.parse(await getJsonWithPuppeteer(endpoint))

            // ... (sisa kode di bawah ini tetap sama)
            let logo = "";
            const profiles = Object.entries(data.Profiles[0])

                .map(row => {
                    let key = row[0];
                    let value = row[1];

                    if (key == "Logo") {
                        value = `https://www.idx.co.id` + value
                        logo = value as string

                    };

                    if (typeof value === "boolean") value = value ? "Ya" : "Tidak";
                    if (value == null) value = "N/A";

                    return [key, value];

                })
                .map(row => `${row[0]}: ${row[1]}`).join("\n");
            const shareHolders = Object.entries(calculateShareholderDistribution(data.PemegangSaham))
                .map(row => `${row[0]}: ${row[1].count} Lembar (${row[1].percentage.toFixed(2)}%)`)
                .join("\n");
            const message = `*Profil Perusahaan:*
${profiles}

*Share Holders:*
${shareHolders}`;

            await sock.sendMessage(remoteJid, {
                image: {
                    url: "https://unsplash.com/photos/VsPGJqafmTk/download?ixid=M3wxMjA3fDB8MXxzZWFyY2h8M3x8aW5kb25lc2lhJTIwc3RvY2slMjBleGNoYW5nZXxlbnwwfHx8fDE3NTg5NDIwOTN8MA&force=true&w=1920",
                },
                caption: message
            });
        } catch (e: any) {
            console.error(e);
            throw new UnexpectedError(e.message);
        }
    }
}