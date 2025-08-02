import type { Command } from "../../../types/Command";
import { exec } from "child_process";

export const execute: Command = {
    name: "execute",
    description: "Execute command",
    cmd: ["execute", "exec", ">"],
    isOnlyOwner: true,
    category: "sudo",
    execute: async (sock, msg, args) => {
        try {
            const cli = args?.[0];

            if (!cli) {
                await sock.sendMessage(msg.key.remoteJid!, { text: "Please provide command line syntax" }, { quoted: msg });
                return;
            }

            exec(cli, (err, stdout, stderr) => {
                if (err) {
                    sock.sendMessage(msg.key.remoteJid!, { text: err.message }, { quoted: msg });
                    return;
                }

                sock.sendMessage(msg.key.remoteJid!, { text: stdout }, { quoted: msg });
            });
        } catch (err) {
            console.log(err);
            await sock.sendMessage(msg.key.remoteJid!, { text: "An error occurred while trying to execute the command. Please try again." }, { quoted: msg });
        }
    }
}