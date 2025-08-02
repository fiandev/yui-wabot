import { type Command } from "../../../types/Command";
import UnexpectedError from "../../exceptions/UnexpectedError";
import log from "../../utils/log";
import { getMetadata } from "../../utils/Mediadown";
import { t } from "../../utils/translate";

export const downloader: Command = {
    cmd: ["downloader", "dl"],
    name: "downloader",
    description: "Download anything from internet",
    // isAuth: true,
    // isPremium: true,
    execute: async (sock, msg, args, auth) => {
        try {
            let url = args?.[0];

            if (!url) {
                await sock.sendMessage(msg.key.remoteJid!, { text: await t("Please provide a url") }, { quoted: msg });
                return;
            }

            console.log(url);

            // await sock.sendMessage(msg.key.remoteJid!, { react: { text: "🔍" } }, { quoted: msg });
            const metadata = await getMetadata(url!);

            // if (!metadata) {
            //     await sock.sendMessage(msg.key.remoteJid!, { text: `failed to get metada from url [${url}]` });
            //     return;
            // }

            // for (let resource of metadata.resources) {
            //     await sock.sendMessage(msg.key.remoteJid!, { react: { text: "📥" } }, { quoted: msg });

            //     await sock.sendMessage(
            //         msg.key.remoteJid!,
            //         {
            //             video: {
            //                 url: resource
            //             },
            //         },
            //         { quoted: msg }
            //     );
            // }

            // sock.sendMessage(msg.key.remoteJid!, { react: { text: "✅" } }, { quoted: msg });
        } catch (e: any) {
            console.error(e);
            throw new UnexpectedError(e.message);
        }
    }
}