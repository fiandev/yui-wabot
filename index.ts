import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";
import { config } from "dotenv";
import { Boom } from "@hapi/boom";
import { commands, middlewares } from "./src/registry";
import { bot } from "./src/config/bot";
import qrcode from "qrcode-terminal";
import FastDB from "./src/lib/FastDB";
import type { Command } from "./types/Command";

import UnexpectedError from "./src/exceptions/UnexpectedError";
import { senderIdentity } from "./src/utils/senderIdentity";
import log from "./src/utils/log";
import { t } from "./src/utils/translate";
import { sleep } from "bun";
import Authenticate from "./src/lib/Authenticate";

(async () => {
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');

    /**
     * Load environment variables
     */
    config({ path: "./.env" });
    config({ path: "./.env.development", override: true });
    config({ path: "./.env.production", override: true });

    /**
     * Load database
     */
    global.db = FastDB.load(process.env.APP_ENV === "production" ?
        "./storage/db.production.zip" :
        "./storage/db.zip"
    );

    for (const [key, value] of Object.entries(bot)) {
        global.db.set(key, value);
    }

    /**
     * Start bot
     * 
     * @returns void
     */
    const startBot = async () => {
        const sock = makeWASocket({
            auth: state,
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("messages.upsert", async ({ messages }) => {
            for (const msg of messages) {
                if (msg.key.fromMe || !msg.message || msg.message.stickerMessage) return true;

                const sender = senderIdentity(msg);

                log.info(`[${ sender.name || sender.jid }] Message ID: ${msg.key.id} | from: ${msg.key.participant}`);

                const remoteJid = msg.key.remoteJid!;
                const message = msg.message.conversation ||
                    msg.message.extendedTextMessage?.text || "";

                // Identify command
                const prefix = bot.prefix;
                const prefixMatch = message.match(prefix);

                // Execute middlewares
                for (const middleware of middlewares) {
                    let isNext = await middleware.execute(sock, msg);
                    if (!isNext) break;
                }

                if (prefixMatch) {
                    const matchs = prefixMatch.input?.replace(prefix, "").trim().split(" ");
                    if (!matchs) continue;

                    const cmd = matchs[0];
                    const args = matchs[1] || "";
                    const splitedArgs = args.split(bot.argsSeparator)
                        .map((v: string) => v.trim())
                        .filter((v: string) => !bot.argsSeparator.test(v));
                    const command = commands.find((c: Command) => c.cmd.includes(cmd!));
                    
                    if (command?.isOnlyGroup && !sender.isGroup || command?.isOnlyOwner && !sender.isOwner) {
                        await sock.sendMessage(remoteJid, { text: `${command?.isOnlyGroup ? await t("This command is only for group") : await t("This command is only for owner")}` }, { quoted: msg });
                        continue;
                    };

                    if (command) {
                        try {
                            if (command.isAuth) {
                                let auth = new Authenticate();
                                let jid = msg.key.remoteJid!;

                                if (!auth.check(jid)) {
                                    await sock.sendMessage(jid, { text: await t("You're not registered.") }, { quoted: msg });
                                    continue;
                                }
                            }

                            await command.execute(sock, msg, splitedArgs);
                            await sleep(bot.delayMessage);

                        } catch (e: any) {
                            if (e instanceof UnexpectedError) {
                                if (sender.isBot || sender.isOwner) {
                                    await sock.sendMessage(remoteJid, { text: e.message }, { quoted: msg });
                                }
                            }
                        }
                    }
                } else {
                    const mediaCommand = commands.find((c: Command) => c.isMedia);
                    const hasImage = !!msg.message?.imageMessage;
                    if (hasImage && mediaCommand) {
                        await mediaCommand.execute(sock, msg);
                    }
                }
            }


        });

        sock.ev.on("connection.update", (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log("📲 Scan QR ini dengan WhatsApp:");
                qrcode.generate(qr, { small: true });
            }

            if (connection === "close") {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== 401;
                if (shouldReconnect) startBot();
            }
        });
    };

    startBot();
})()