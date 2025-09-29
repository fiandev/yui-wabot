import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import type { WASocket } from "@whiskeysockets/baileys"
import Pino from "pino";
import qrcode from "qrcode-terminal";
import path from "path";
import dns from "dns";
import { request, Agent } from "undici";
import whois from "whois-json";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Support multiple group IDs (comma-separated via env GROUP_IDS), fallback to default
const GROUP_IDS: string[] = (process.env.GROUP_IDS || "120363401505796035@g.us")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.endsWith("@g.us"));
// No name-based alias detection per request; only official mentions and @<phone>
// Optional: extra JIDs/numbers for mention matching (comma-separated), e.g. BOT_JIDS="34162622890230@lid,6285179640870@s.whatsapp.net,34162622890230"
const BOT_EXTRA_JIDS: string[] = (
    process.env.BOT_JIDS || "34162622890230@lid,6285179640870"
)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
// Always reply when this JID is mentioned (exact), regardless of matching heuristics
const ALWAYS_REPLY_TO_JID = (
    process.env.ALWAYS_REPLY_TO_JID || "34162622890230@lid"
).toLowerCase();

async function startBot(): Promise<WASocket> {
    const logger = Pino({ level: "info" });
    const { state, saveCreds } = await useMultiFileAuthState(
        path.join(process.cwd(), "auth")
    );

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        auth: state,
        browser: ["Baileys-Bot", "Chrome", "1.0"],
        markOnlineOnConnect: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            try {
                qrcode.generate(qr, { small: true });
            } catch { }
        }
        if (connection === "close") {
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const isConflict = (
                lastDisconnect?.error as any
            )?.output?.payload?.message
                ?.toLowerCase?.()
                .includes("conflict");
            if (isConflict) {
                // Session replaced elsewhere. Stop to avoid flapping.
                return;
            }
            if (statusCode !== DisconnectReason.loggedOut) {
                startBot().catch(() => { });
            }
        }
    });

    // Optional: in-memory message store removed for compatibility with current Baileys version

    // Connection gating and safe send helpers
    let isConnected = false;
    sock.ev.on("connection.update", ({ connection }) => {
        if (connection === "open") {
            isConnected = true;
            // Log bot JID for debugging mentions
            console.log(`Bot connected with JID: ${sock.user?.id || "unknown"}`);
        }
        if (connection === "close") isConnected = false;
    });

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async function waitUntilConnected(timeoutMs = 15000) {
        const start = Date.now();
        while (!isConnected && Date.now() - start < timeoutMs) {
            await delay(250);
        }
    }

    async function safeSendMessage(jid: string, content: any, options?: any) {
        await waitUntilConnected();
        try {
            return await sock.sendMessage(jid, content, options);
        } catch (e: any) {
            const code = e?.output?.statusCode;
            if (code === 428) {
                await delay(1200);
                await waitUntilConnected(10000);
                return await sock.sendMessage(jid, content, options);
            }
            throw e;
        }
    }

    async function safeGroupMetadata(jid: string) {
        await waitUntilConnected();
        try {
            return await sock.groupMetadata(jid);
        } catch (e: any) {
            const code = e?.output?.statusCode;
            if (code === 428) {
                await delay(1200);
                await waitUntilConnected(10000);
                return await sock.groupMetadata(jid);
            }
            throw e;
        }
    }

    // Helpers to extract text, quoted text, and mentions reliably across message types
    function unwrapInnerMessage(m: any): any {
        let cur = m;
        let depth = 0;
        while (cur && depth < 5) {
            // Common wrappers
            if (cur.ephemeralMessage?.message) {
                cur = cur.ephemeralMessage.message;
                depth++;
                continue;
            }
            if (cur.viewOnceMessage?.message) {
                cur = cur.viewOnceMessage.message;
                depth++;
                continue;
            }
            if (cur.viewOnceMessageV2?.message) {
                cur = cur.viewOnceMessageV2.message;
                depth++;
                continue;
            }
            if (cur.deviceSentMessage?.message) {
                cur = cur.deviceSentMessage.message;
                depth++;
                continue;
            }
            if (cur.documentWithCaptionMessage?.message) {
                cur = cur.documentWithCaptionMessage.message;
                depth++;
                continue;
            }
            break;
        }
        return cur;
    }

    function extractTextFromMessage(m: any): string {
        if (!m) return "";
        const inner = unwrapInnerMessage(m);
        return (
            inner?.conversation ||
            inner?.extendedTextMessage?.text ||
            inner?.imageMessage?.caption ||
            inner?.videoMessage?.caption ||
            inner?.documentWithCaptionMessage?.message?.extendedTextMessage?.text ||
            inner?.buttonsMessage?.contentText ||
            inner?.templateMessage?.hydratedTemplate?.hydratedContentText ||
            inner?.interactiveMessage?.body ||
            inner?.listMessage?.description ||
            inner?.listMessage?.buttonText ||
            ""
        );
    }

    function extractQuotedText(msgAny: any): string {
        const qmRaw =
            msgAny?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const qm = unwrapInnerMessage(qmRaw);
        if (!qm) return "";
        return extractTextFromMessage(qm);
    }

    function collectMentionedJids(container: any): string[] {
        const result = new Set<string>();
        const stack: any[] = [];
        const pushIfObject = (v: any) => {
            if (v && typeof v === "object") stack.push(v);
        };
        pushIfObject(container);
        let steps = 0;
        const keysToDescend = [
            "message",
            "contextInfo",
            "extendedTextMessage",
            "imageMessage",
            "videoMessage",
            "documentWithCaptionMessage",
            "ephemeralMessage",
            "viewOnceMessage",
            "viewOnceMessageV2",
            "deviceSentMessage",
            "interactiveMessage",
            "buttonsMessage",
            "templateMessage",
        ];
        while (stack.length && steps < 100) {
            const cur = stack.pop();
            steps++;
            if (cur?.contextInfo?.mentionedJid) {
                for (const j of cur.contextInfo.mentionedJid) result.add(String(j));
            }
            for (const k of keysToDescend) {
                const v = cur?.[k];
                if (!v) continue;
                if (v?.message) pushIfObject(v.message);
                pushIfObject(v);
            }
        }
        return Array.from(result);
    }

    function isMentioningTarget(msgAny: any, targetJid: string): boolean {
        if (!targetJid) return false;
        const m = msgAny.message as any;
        const mentioned = collectMentionedJids(m).map((j) => j.toLowerCase());
        const targets = [targetJid, jidNormalizedUser(targetJid)].map((s) =>
            s.toLowerCase()
        );
        if (
            mentioned.some(
                (j) =>
                    targets.includes(j) ||
                    targets.includes(jidNormalizedUser(j).toLowerCase())
            )
        )
            return true;
        return false;
    }

    function isMentioningMe(msgAny: any): boolean {
        const myRaw = sock.user?.id || "";
        if (!myRaw) return false;

        const myJid = jidNormalizedUser(myRaw);
        const myNum = myJid.split("@")[0].split(":")[0];
        const phoneOnly = myNum.replace(/^\+?/, "");

        // Derive LID base if this session uses LID identity
        const isLid = /@lid$/i.test(myRaw);
        const lidBase = isLid
            ? myRaw.split("@")[0].split(":")[0].replace(/\D/g, "")
            : "";

        // Build comprehensive candidate set
        const candidateJids = new Set<string>([
            myRaw,
            myJid,
            `${myNum}@s.whatsapp.net`,
            `${phoneOnly}@s.whatsapp.net`,
            `${myNum}@whatsapp.net`,
            `${phoneOnly}@whatsapp.net`,
            `${myNum}@lid`,
            `${phoneOnly}@lid`,
            // LID base variants (without device suffix)
            ...(lidBase ? [`${lidBase}@lid`] : []),
            ...BOT_EXTRA_JIDS,
            ...BOT_EXTRA_JIDS.map((j) => jidNormalizedUser(j)),
        ]);
        // Also add numbers from BOT_EXTRA_JIDS
        for (const j of BOT_EXTRA_JIDS) {
            const num = String(j).split("@")[0].split(":")[0].replace(/\D/g, "");
            if (num) {
                candidateJids.add(`${num}@s.whatsapp.net`);
                candidateJids.add(`${num}@whatsapp.net`);
                candidateJids.add(`${num}@lid`);
            }
        }

        const m = msgAny.message as any;
        // Collect mentioned JIDs deeply (handles ephemeral/viewOnce wrappers)
        let mentioned: string[] = collectMentionedJids(m);

        mentioned = [...new Set(mentioned)];

        // Check if any mentioned JID contains our phone number or LID base (flexible matching)
        for (const mentionedJid of mentioned) {
            const normalizedMention = jidNormalizedUser(mentionedJid);
            const mentionNumFull = normalizedMention
                .split("@")[0]
                .split(":")[0]
                .replace(/\D/g, "");
            const botNumFull = phoneOnly;

            // 1) Direct full-number match (phone)
            if (mentionNumFull && botNumFull && mentionNumFull === botNumFull) {
                return true;
            }
            // 2) LID base match
            if (lidBase && mentionNumFull === lidBase) {
                return true;
            }

            // 3) Tail match 9–11 digits (handles local vs intl formatting)
            const tail = (s: string, n: number) => (s.length > n ? s.slice(-n) : s);
            const pairs = [11, 10, 9];
            for (const n of pairs) {
                if (
                    tail(mentionNumFull, n) &&
                    tail(mentionNumFull, n) === tail(botNumFull, n)
                ) {
                    return true;
                }
                if (lidBase && tail(mentionNumFull, n) === tail(lidBase, n)) {
                    return true;
                }
            }

            // 4) Exact JID matches
            if (
                candidateJids.has(mentionedJid) ||
                candidateJids.has(normalizedMention)
            ) {
                return true;
            }
        }

        // Fallback: check text patterns (accept @~ and other symbols before number)
        const text = extractTextFromMessage(m) || "";
        const symbolPrefix = "@[^0-9+]*";
        if (
            phoneOnly &&
            new RegExp(`${symbolPrefix}\\+?${phoneOnly}\\b`).test(text)
        )
            return true;
        if (
            myNum !== phoneOnly &&
            new RegExp(`${symbolPrefix}\\+?${myNum}\\b`).test(text)
        )
            return true;
        if (lidBase && new RegExp(`${symbolPrefix}${lidBase}\\b`).test(text))
            return true;

        // Also: directly honor ALWAYS_REPLY_TO_JID
        if (isMentioningTarget(msgAny, ALWAYS_REPLY_TO_JID)) return true;

        // Debug log for troubleshooting mentions with contact names
        if (mentioned.length > 0) {
            console.log(
                `Mention detected but not matching bot. Mentioned JIDs:`,
                mentioned
            );
            console.log(`Bot JID candidates:`, Array.from(candidateJids));
            console.log(`Text content:`, text);
        }

        return false;
    }

    // Welcome/leave messages for the target group
    sock.ev.on(
        "group-participants.update",
        async ({ id, participants, action }) => {
            try {
                if (!GROUP_IDS.includes(id)) return;
                if (!participants?.length) return;
                if (action === "add") {
                    const mentions = participants;
                    const lines = participants.map(
                        (p) => `@${p.split("@")[0]} selamat datang! 😊`
                    );
                    await safeSendMessage(id, { text: lines.join("\n"), mentions });
                } else if (action === "remove") {
                    const mentions = participants;
                    const lines = participants.map(
                        (p) => `@${p.split("@")[0]} telah keluar.`
                    );
                    await safeSendMessage(id, { text: lines.join("\n"), mentions });
                }
            } catch { }
        }
    );

    // Background notifications poller
    (async function runNotificationsPoller() {
        const stateFile = path.join(
            process.cwd(),
            "auth",
            "notifications_state.json"
        );
        const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });
        let seen = new Set<string>();
        try {
            const raw = fs.existsSync(stateFile)
                ? fs.readFileSync(stateFile, "utf8")
                : "{}";
            const parsed = JSON.parse(raw || "{}");
            if (Array.isArray(parsed?.seen)) seen = new Set<string>(parsed.seen);
        } catch { }

        async function saveSeen() {
            try {
                fs.mkdirSync(path.dirname(stateFile), { recursive: true });
                fs.writeFileSync(
                    stateFile,
                    JSON.stringify({ seen: Array.from(seen) }, null, 2)
                );
            } catch { }
        }

        async function tick() {
            try {
                const res = await request(
                    "https://43.157.209.153/api/v1/notifications",
                    {
                        method: "GET",
                        headers: { accept: "application/json" },
                        dispatcher: insecureAgent,
                    }
                );
                const json: any = await res.body.json();
                const items: any[] = Array.isArray(json)
                    ? json
                    : Array.isArray(json?.data)
                        ? json.data
                        : [];
                const newItems = items.filter((n: any) => {
                    const id = String(n.id ?? n._id ?? n.uuid ?? n.key ?? "");
                    return id && !seen.has(id);
                });
                if (newItems.length) {
                    const blocks = newItems.slice(0, 5).map((n: any) => {
                        const id = String(n.id ?? n._id ?? n.uuid ?? n.key ?? "");
                        if (id) seen.add(id);
                        const title = String(n.title ?? "(no title)");
                        const content = String(n.content ?? n.message ?? n.text ?? "");
                        return ["Notifications:", title, content].join("\n");
                    });
                    for (const gid of GROUP_IDS) {
                        await safeSendMessage(gid, { text: blocks.join("\n\n") });
                    }
                    await saveSeen();
                }
            } catch { }
            setTimeout(tick, 30_000);
        }
        tick();
    })();

    // First-blood poller removed per user request

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid!;
        const isGroup = from.endsWith("@g.us");
        const sender = jidNormalizedUser(
            msg.key.participant || msg.key.remoteJid || ""
        );

        const text = extractTextFromMessage(msg.message);

        const reply = async (content: string) => {
            await safeSendMessage(from, { text: content }, { quoted: msg });
        };

        // In groups: ignore plain messages without hashtag command and without mentioning the bot
        if (isGroup) {
            const startsWithHash = /^\s*#/.test(text);
            // Only proceed if the bot itself is mentioned or a command is used
            if (!startsWithHash && !isMentioningMe(msg)) {
                return;
            }
        }

        // Basic commands
        if (/^#ping\b/i.test(text)) {
            return reply("pong");
        }
        if (/^#id\b/i.test(text)) {
            return reply(`your jid: ${sender}`);
        }
        if (/^#help\b/i.test(text)) {
            return reply(
                [
                    "Commands:",
                    "#ping",
                    "#id",
                    "#help",
                    "#groupinfo (group only)",
                    "#groupid (group only)",
                    "#whois <domain>",
                    "#dns <domain>",
                    "#ipinfo <ip>",
                    "#httphead <url>",
                    "#scoreboard",
                    "#ask <pertanyaan>",
                ].join("\n")
            );
        }

        // AI Q&A (supports quoting a message + extra prompt)
        if (/^#ask(\b|\s+)/i.test(text)) {
            const extra = text.replace(/^#ask\b\s*/i, "");
            const quoted =
                msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const qText =
                quoted?.conversation ||
                quoted?.extendedTextMessage?.text ||
                quoted?.imageMessage?.caption ||
                quoted?.videoMessage?.caption ||
                "";
            const combined = [qText.trim(), extra.trim()]
                .filter(Boolean)
                .join("\n\n");
            const q = combined || extra || qText;
            if (!q) return reply("pertanyaan kosong");
            const apiKey = process.env.OPENAI_API_KEY;
            const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
            if (!apiKey)
                return reply("AI belum dikonfigurasi. Set OPENAI_API_KEY di .env");
            try {
                const res = await request(
                    "https://api.openai.com/v1/chat/completions",
                    {
                        method: "POST",
                        headers: {
                            authorization: `Bearer ${apiKey}`,
                            "content-type": "application/json",
                        },
                        body: JSON.stringify({
                            model,
                            messages: [
                                {
                                    role: "system",
                                    content:
                                        "You are a cute, cheerful, and kawaii assistant girl 🌸. Always give expert, accurate, and concise answers in Indonesian if the user writes in Indonesian, while keeping a friendly and adorable tone, and cute expressions to make the conversation fun and lively. your name is Lappu-chan",
                                },
                                { role: "user", content: q },
                            ],
                            temperature: 0.3,
                            max_tokens: 400,
                        }),
                    }
                );
                const json: any = await res.body.json();
                const answer = json?.choices?.[0]?.message?.content?.trim();
                return reply(answer || "(tidak ada jawaban)");
            } catch {
                return reply("gagal memproses AI");
            }
        }

        // Security utilities
        if (/^#whois\s+\S+/i.test(text)) {
            const domain = text.split(/\s+/)[1]?.trim();
            if (!domain || /[^a-z0-9.-]/i.test(domain))
                return reply("invalid domain");
            try {
                const data = await whois(domain, { follow: 3, timeout: 8000 });
                const out = Object.entries(data)
                    .slice(0, 20)
                    .map(([k, v]) => `${k}: ${String(v).slice(0, 180)}`)
                    .join("\n");
                return reply(out || "no whois data");
            } catch {
                return reply("whois error");
            }
        }

        if (/^#dns\s+\S+/i.test(text)) {
            const domain = text.split(/\s+/)[1]?.trim();
            if (!domain || /[^a-z0-9.-]/i.test(domain))
                return reply("invalid domain");
            try {
                const results: string[] = [];

                // Query specific record types instead of ANY
                const queries = [
                    { type: "A", resolver: dns.resolve4 },
                    { type: "AAAA", resolver: dns.resolve6 },
                    { type: "CNAME", resolver: dns.resolveCname },
                    { type: "MX", resolver: dns.resolveMx },
                    { type: "TXT", resolver: dns.resolveTxt },
                    { type: "NS", resolver: dns.resolveNs },
                ];

                for (const query of queries) {
                    try {
                        const records = await new Promise<any[]>((resolve, reject) => {
                            query.resolver(domain, (err, records) => {
                                if (err) reject(err);
                                else resolve(records || []);
                            });
                        });

                        if (records.length > 0) {
                            if (query.type === "A" || query.type === "AAAA") {
                                records.forEach((record: any) => {
                                    results.push(`${query.type}: ${record}`);
                                });
                            } else if (query.type === "CNAME") {
                                records.forEach((record: any) => {
                                    results.push(`${query.type}: ${record}`);
                                });
                            } else if (query.type === "MX") {
                                records.forEach((record: any) => {
                                    results.push(
                                        `${query.type}: ${record.exchange} (priority: ${record.priority})`
                                    );
                                });
                            } else if (query.type === "TXT") {
                                records.forEach((record: any) => {
                                    const txt = Array.isArray(record) ? record.join(" ") : record;
                                    results.push(`${query.type}: ${txt}`);
                                });
                            } else if (query.type === "NS") {
                                records.forEach((record: any) => {
                                    results.push(`${query.type}: ${record}`);
                                });
                            }
                        }
                    } catch (err) {
                        // Skip this record type if it fails
                        continue;
                    }
                }

                const out = results.slice(0, 15).join("\n");
                return reply(out || "no records found");
            } catch (err: any) {
                return reply(`dns error: ${err?.message || "unknown error"}`);
            }
        }

        if (/^#ipinfo\s+\S+/i.test(text)) {
            const ip = text.split(/\s+/)[1]?.trim();
            if (!ip || !/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip))
                return reply("invalid ip");
            try {
                const res = await request(`https://ipapi.co/${ip}/json/`, {
                    method: "GET",
                });
                const json: any = await res.body.json();
                const keys = [
                    "ip",
                    "version",
                    "city",
                    "region",
                    "country_name",
                    "org",
                    "asn",
                ];
                const out = keys
                    .filter((k) => json?.[k])
                    .map((k) => `${k}: ${String((json as any)[k]).slice(0, 120)}`)
                    .join("\n");
                return reply(out || "no ip info");
            } catch {
                return reply("ipinfo error");
            }
        }

        if (/^#httphead\s+\S+/i.test(text)) {
            const url = text.split(/\s+/)[1]?.trim();
            if (!url || !/^https?:\/\//i.test(url))
                return reply("invalid url (must start with http/https)");
            try {
                const res = await request(url, { method: "HEAD" });
                const entries = Object.entries(
                    res.headers || ({} as Record<string, unknown>)
                )
                    .slice(0, 20)
                    .map(
                        ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`
                    )
                    .join("\n");
                return reply(entries || `status: ${res.statusCode}`);
            } catch {
                return reply("http error");
            }
        }

        if (/^#scoreboard\b/i.test(text)) {
            const url = "https://43.157.209.153/api/v1/scoreboard";
            try {
                const insecureAgent = new Agent({
                    connect: { rejectUnauthorized: false },
                });
                const res = await request(url, {
                    method: "GET",
                    headers: { accept: "application/json" },
                    dispatcher: insecureAgent,
                });
                const json: any = await res.body.json();
                let rows: any[] = [];
                if (Array.isArray(json)) rows = json;
                else if (Array.isArray(json?.data)) rows = json.data;
                else if (Array.isArray(json?.data?.standings))
                    rows = json.data.standings;
                else if (Array.isArray(json?.standings)) rows = json.standings;

                const top = rows.slice(0, 10).map((r: any, i: number) => {
                    const name =
                        r.name ||
                        r.user ||
                        r.username ||
                        r.team ||
                        r.handle ||
                        r.n ||
                        "unknown";
                    const score = r.score ?? r.points ?? r.p ?? r.s ?? 0;
                    return `${i + 1}. ${String(name).slice(0, 40)} — ${score}`;
                });

                if (!top.length) return reply("no scoreboard data");
                return reply(["Top 10:", ...top].join("\n"));
            } catch {
                return reply("scoreboard error");
            }
        }

        // Group specific handlers
        if (isGroup) {
            if (/^#groupid\b/i.test(text)) {
                try {
                    const meta = await safeGroupMetadata(from);
                    return reply(`group id: ${from}\nname: ${meta.subject}`);
                } catch {
                    return reply(`group id: ${from}`);
                }
            }
            if (GROUP_IDS.includes(from) && /^#groupinfo\b/i.test(text)) {
                try {
                    const meta = await safeGroupMetadata(from);
                    await reply(
                        `group: ${meta.subject}\nparticipants: ${meta.participants.length}`
                    );
                } catch {
                    await reply("failed to fetch group info");
                }
            }

            // Mention-aware AI response (@bot)
            if (isMentioningMe(msg) || isMentioningTarget(msg, ALWAYS_REPLY_TO_JID)) {
                const qText = extractQuotedText(msg);
                const rawText = text.trim();
                // Remove all @mentions from text, not just numeric ones
                const textWithoutMention = rawText.replace(/@\S+/g, "").trim();

                // If no meaningful text after removing mentions, don't respond
                if (!textWithoutMention && !qText) {
                    return;
                }

                const prompt = [qText, textWithoutMention]
                    .filter(Boolean)
                    .join("\n\n")
                    .trim();

                const apiKey = process.env.OPENAI_API_KEY;
                const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
                if (!apiKey) {
                    await reply("AI belum dikonfigurasi. Set OPENAI_API_KEY di .env");
                } else {
                    try {
                        const res = await request(
                            "https://api.openai.com/v1/chat/completions",
                            {
                                method: "POST",
                                headers: {
                                    authorization: `Bearer ${apiKey}`,
                                    "content-type": "application/json",
                                },
                                body: JSON.stringify({
                                    model,
                                    messages: [
                                        {
                                            role: "system",
                                            content:
                                                "You are a super kawaii anime girl 🌸😽, cheerful, cute, and charming 💖. Act as a friendly teammate in the same group. Always reply in Indonesian if the user writes in Indonesian. Your answers must be **accurate, professional, and expert-level**, but you can sprinkle in a friendly kawaii tone, and cute expressions to make the conversation fun and lively ✨🎀. your name is Lappu-chan",
                                        },
                                        { role: "user", content: prompt },
                                    ],
                                    temperature: 0.3,
                                    max_tokens: 400,
                                }),
                            }
                        );
                        const json: any = await res.body.json();
                        const answer = json?.choices?.[0]?.message?.content?.trim();
                        await reply(answer || "(tidak ada jawaban)");
                    } catch {
                        await reply("gagal memproses AI");
                    }
                }
            }
        }
    });

    return sock;
}

startBot().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("failed to start bot", err);
    process.exit(1);
});