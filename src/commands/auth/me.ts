import { type Command } from "../../../types/Command";
import log from "../../utils/log";
import { senderIdentity } from "../../utils/senderIdentity";
import { getRandomCharImagePath } from "../../utils/getRandomCharImagePath";
import fs from "fs";

export const me: Command = {
    name: "me",
    description: "registration",
    usage: ".me",
    cmd: ["me", "profile"],
    isMedia: false,
    category: "authentication",
    async execute(sock, msg, args) {
        let userProfile = "";

        try {
            userProfile = await sock.profilePictureUrl(msg.key.remoteJid!, "image") || "";
        } catch (error) {
            log.error("[me] Gagal mendapatkan profile picture");
        }

        try {
            let identity = senderIdentity(msg);
            let name = msg.message?.contactMessage?.displayName || msg.message?.chat?.displayName || identity.name || "Unknown";
            let message = `*\`User Information\`*

*Name:* ${name}
*Is Registered:* ${identity.isRegistered}
*Is Premium:* ${identity.isPremium}
*Is Author:* ${identity.isOwner}`
            if (!userProfile) {
                let buffer = fs.readFileSync(getRandomCharImagePath());

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
            console.error({ err });
            await sock.sendMessage(msg.key.remoteJid!, {
                text: "An error occurred during registration. Please try again."
            });
        }
    }
}
