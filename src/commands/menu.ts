import type { Command } from "../../types/Command";
import UnexpectedError from "../exceptions/UnexpectedError";
import { commands } from "../registry";
import { t } from "../utils/translate";

const format = {
    heading: `﹂%s﹁`,
    separator: `

⤷ %s`,
    item: `
| %a
➦ %b`,
    footer: `
|――[%s]――>`
}

export const menu: Command = {
    name: "menu",
    cmd: ["menu", "help", "h"],
    description: "Deskripsi menu",
    async execute(sock, msg) {
        try {
            let text = "";
            let botName = db.get("botName") || "BOT";

            text += format.heading.replace("%s", `Menu - ${botName}`);
            const grouped: Record<string, Command[]> = {};

            commands.forEach((command: Command) => {
                if (!grouped[command.category || "General"]) {
                    grouped[command.category || "General"] = [];
                }
                grouped[command.category || "General"].push(command);
            });

            for (const category in grouped) {
                text += format.separator.replace("%s", await t(category));

                for (const cmd of grouped[category]) {
                    let cmdRule = cmd.cmd
                        .map((cmd: string) => `.${cmd}`)
                        .join(" | ");
                    text += format.item
                        .replace("%a", `${cmd.description} ${cmd.isPremium ? " (✧)" : ""}`)
                        .replace("%b", cmdRule);
                }
            }
            text += format.footer.replace("%s", new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }));

            await sock.sendMessage(msg.key.remoteJid!, { text });
        } catch (err) {
            console.log(err);

            throw new UnexpectedError("Gagal menangani command menu");
        }
    }
}
