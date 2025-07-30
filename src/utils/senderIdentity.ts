import type { proto } from "@whiskeysockets/baileys";
import Authenticate from "../lib/Authenticate";

export function senderIdentity(message: proto.IWebMessageInfo) {
    const senderJid = message.key.remoteJid!;
    const sender = senderJid.split("@")[0];

    const authors = db.get("authors")?.length ? db.get("authors") : [];
    const isOwner = authors.includes(sender);
    const user = new Authenticate().getUser(senderJid);
    const isGroup = senderJid.endsWith("@g.us") || false;
    const from = isGroup ? message.key.participant : message.key.remoteJid;
    const phone = from?.split("@")[0] || "";

    return {
        phone,
        type: isGroup ? "group" : "user",
        name: user ? user.name : sender,
        jid: senderJid,
        isGroup,
        isBot: message.key.fromMe,
        isOwner,
        isRegistered: user ? true : false,
    };
}