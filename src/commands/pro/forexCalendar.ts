import type { Command } from "../../../types/Command";
import UnexpectedError from "../../exceptions/UnexpectedError";
import moment from "moment";

export const forexCalendar: Command = {
    name: "forex-calendar",
    description: "Get forex calendar",
    cmd: ["forex-calendar", "fc", "forexcalendar"],
    isAuth: true,
    isPremium: false,
    category: "tools",
    execute: async (sock, msg, args) => {
        try {
            let currency = "";
            let url = "https://api.tradingeconomics.com/calendar?c=guest:guest&f=json";

            if (args) {
                currency = args[0] || "";
            }

            let response = await fetch(url);
            let data = await response.json();

            let filtered = data.filter((item: any) => {
                if (currency) {
                    if (item.Currency.toLowerCase() !== currency.toLowerCase()) {
                        return;
                    }
                }

                return true;
            });

            let message = filtered.map((item: any) => {
                let date = new Date(item.Date);
                let country = item.Country;
                let forecast = item.TEForecast;
                let previous = item.Previous;
                let actual = item.Actual;
                let impact = ["Low", "Medium", "High"][item.Importance - 1];

                return `${moment(date).locale('id').format("dddd, DD MMMM YYYY HH:mm")}

*${country} - ${impact}*
${item.Event}

*ticker:* \`${item.Ticker}\`
*previous:* ${previous}
*forecast:* ${forecast}
*actual:* ${actual}`;
            }).join("\n\n");

            if (!message) {
                message = "Tidak ada data";
            }

            await sock.sendMessage(msg.key.remoteJid!, { text: message }, { quoted: msg });
        } catch (err) {
            console.log({ err });
            throw new UnexpectedError("[ForexCalendar] Gagal mengambil data forex calendar");
        }
    }
}