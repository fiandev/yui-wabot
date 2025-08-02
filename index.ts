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
            syncFullHistory: false,
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages[0];
            if (msg.key.fromMe || !msg.message || msg.message.stickerMessage) return;

            global.timestamp = new Date().getTime();

            const sender = senderIdentity(msg);
            const remoteJid = msg.key.remoteJid!;
            const message = msg.message.conversation ||
                msg.message.extendedTextMessage?.text || "";

            // autoregister
            if (!sender.isRegistered && !msg.key.fromMe) {
                let auth = new Authenticate();

                auth.store({
                    phone: sender.phone,
                    name: sender.name,
                    age: Math.floor(Math.random() * 80),
                });
            }

            // Identify command
            const prefix = bot.prefix;
            const prefixMatch = message.match(prefix);

            log.info(`[${sender.name || "??"} | ${sender.jid}] Message ID: ${msg.key.id} | ${message}`);

            // Execute middlewares
            for (const middleware of middlewares) {
                if (middleware.isAuth) {
                    let auth = new Authenticate();
                    let isGroup = remoteJid.endsWith("@g.us");

                    if (!auth.check(sender.phone) && !msg.key.fromMe) {
                        if (!isGroup) {
                            // await sock.sendMessage(jid, { text: await t("You're not registered, please register first with .register command") }, { quoted: msg });
                        }
                        console.log("[middleware auth]: not registered")
                        continue;
                    }
                }

                let isNext = await middleware.execute(sock, msg);
                if (!isNext) break;
            }

            const matchs = prefixMatch?.input?.replace(prefix, "").trim().split(" ");
            if (!matchs) return;

            const cmd = matchs[0];
            const args = matchs[1] || "";
            const splitedArgs = args.split(bot.argsSeparator)
                .map((v: string) => v.trim())
                .filter((v: string) => !bot.argsSeparator.test(v));
            const command = commands.find((c: Command) => c.cmd.includes(cmd!));

            if (prefixMatch) {
                if (command?.isOnlyGroup && !sender.isGroup || command?.isOnlyOwner && !sender.isOwner) {
                    await sock.sendMessage(remoteJid, { text: `${command?.isOnlyGroup ? await t("This command is only for group") : await t("This command is only for owner")}` }, { quoted: msg });
                    return;
                };

                if (command) {
                    try {
                        let auth = new Authenticate();

                        if (command.isOnlyOwner && !sender.isOwner) {
                            await sock.sendMessage(remoteJid, { text: await t("This command is only for owner") }, { quoted: msg });
                            return;
                        }

                        if (command.isAuth) {
                            if (!auth.check(sender.jid) && !msg.key.fromMe) {
                                await sock.sendMessage(sender.jid, { text: await t("You're not registered.") }, { quoted: msg });
                                return;
                            }
                        }

                        if (command.isPremium && !sender.isPremium) {
                            await sock.sendMessage(sender.jid, { text: await t("You're not premium.") }, { quoted: msg });
                            return;
                        }

                        await command.execute(sock, msg, splitedArgs, auth);
                        await sleep(bot.delayMessage);

                    } catch (e: any) {
                        if (e instanceof UnexpectedError) {
                            if (sender.isBot || sender.isOwner) {
                                await sock.sendMessage(remoteJid, { text: e.message }, { quoted: msg });
                            }
                        }
                    }
                }
            }

            await sleep(bot.delayMessage);
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