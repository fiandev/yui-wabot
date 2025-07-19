import type { proto } from "@whiskeysockets/baileys";
import Authenticate from "../lib/Authenticate";

export function senderIdentity(message: proto.IWebMessageInfo) {
    const senderJid = message.key.remoteJid!;
    const sender = senderJid.split("@")[0];
    
    const authors = db.get("authors")?.length ? db.get("authors") : [];
    const isOwner = authors.includes(sender);
    const user = new Authenticate().getUser(senderJid);

    return {
        number: sender,
        type: senderJid.endsWith("@g.us") ? "group" : "user",
        name: user ? user.name : sender,
        jid: senderJid,
        isGroup: senderJid.endsWith("@g.us"),
        isBot: message.key.fromMe,
        isOwner,
        isRegistered: user ? true : false,
    };
}