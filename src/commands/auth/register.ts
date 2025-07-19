import { z } from "zod";
import { type Command } from "../../../types/Command";
import log from "../../utils/log";
import { t } from "../../utils/translate";
import Authenticate from "../../lib/Authenticate";

export const register: Command = {
    name: "register",
    description: "registration",
    usage: ".reg <name> <age> <profession>",
    cmd: ["register", "reg", "regis"],
    isMedia: false,
    category: "authentication",
    async execute(sock, msg, args) {
        try {
            // Schema validation
            const registerSchema = z.tuple([
                z.string().min(1, await t("Name cannot be empty")),
                z.coerce.number().int().min(10, await t("Age is too low")).max(120, await t("Age is not realistic")),
                z.string().min(1, await t("Profession cannot be empty")),
            ]);
            
            const jid = msg.key.remoteJid!;
            const auth = new Authenticate();
            const result = registerSchema.safeParse(args);

            if (auth.check(jid)) {
                await sock.sendMessage(jid, {
                    text: "You are already registered"
                });
                return;
            }
            
            if (!result.success) {
                const errorMessages = result.error.issues.map(e => `- ${e.message}`).join("\n");
                await sock.sendMessage(jid, {
                    text: `Invalid format:\n${errorMessages}\n\nExample: .reg John 25 Developer`
                });
                return;
            }

            const [name, age, profession] = result.data;
            
            auth.store({ jid, name, age });
            log.info(`[Register] ${name} | ${age} | ${profession}`);

            await sock.sendMessage(jid, {
                text: `✅ Registration successful:\nName: ${name}\nAge: ${age}\nProfession: ${profession}`
            });

        } catch (err) {
            log.error("[Register] Error: " + err);
            await sock.sendMessage(msg.key.remoteJid!, {
                text: "An error occurred during registration. Please try again."
            });
        }
    }
}
