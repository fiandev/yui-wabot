import type { proto } from "@whiskeysockets/baileys";

export function senderIdentity(message: proto.IWebMessageInfo) {
    const senderJid = message.key.remoteJid!;
    const sender = senderJid.split("@")[0];
    
    const authors = db.get("authors")?.length || [];
    const isOwner = authors.includes(sender);

    return {
        number: sender,
        type: senderJid.endsWith("@g.us") ? "group" : "user",
        name: message.key.participant || sender,
        jid: senderJid,
        isGroup: senderJid.endsWith("@g.us"),
        isBot: message.key.fromMe,
        isOwner,
    };
}