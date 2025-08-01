import { z } from "zod";
import { type Command } from "../../../types/Command";
import log from "../../utils/log";
import { t } from "../../utils/translate";
import Authenticate from "../../lib/Authenticate";
import { senderIdentity } from "../../utils/senderIdentity";

export const me: Command = {
    name: "me",
    description: "registration",
    usage: ".me",
    cmd: ["me", "profile"],
    isMedia: false,
    category: "authentication",
    async execute(sock, msg, args) {
        try {
            let userProfile = await sock.profilePictureUrl(msg.key.remoteJid!);
            let identity = senderIdentity(msg);
            let name = msg.message?.contactMessage?.displayName || msg.message?.chat?.displayName || identity.name || "Unknown";
            let message = `*\`User Information\`*

*Name:* ${name}
*Is Registered:* ${identity.isRegistered}
*Is Premium:* ${identity.isPremium}
*Is Author:* ${identity.isOwner}`
            if (!userProfile) {
                let avatar = await fetch(`https://api.dicebear.com/7.x/initials/svg?seed=${name}`)
                let buffer = Buffer.from(await avatar.arrayBuffer());
                await sock.sendMessage(msg.key.remoteJid!, {
                    image: buffer,
                    caption: message
                });
            } else {
                await sock.sendMessage(msg.key.remoteJid!, {
                    image: { url: userProfile },
                    caption: message
                });
            }

        } catch (err) {
            log.error("[Register] Error: " + err);
            await sock.sendMessage(msg.key.remoteJid!, {
                text: "An error occurred during registration. Please try again."
            });
        }
    }
}
