import { type Command } from "../../../types/Command";
import log from "../../utils/log";
import Authenticate from "../../lib/Authenticate";

export const unregister: Command = {
    name: "unregister",
    description: "remove registration",
    usage: ".unreg",
    cmd: ["unregister", "unreg", "hapusakun"],
    isAuth: true,
    category: "authentication",
    async execute(sock, msg) {
        try {
            const jid = msg.key.remoteJid!;
            const auth = new Authenticate();

            auth.remove(jid);
            log.info(`[Unregister] ${jid} has been unregistered`);

            await sock.sendMessage(jid, {
                text: "✅ Your registration has been removed successfully."
            });

        } catch (err) {
            log.error("[Unregister] Error: " + err);
            await sock.sendMessage(msg.key.remoteJid!, {
                text: "An error occurred while trying to unregister. Please try again."
            });
        }
    }
}
