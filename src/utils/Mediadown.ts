import path from "path";
import fs from "fs";
import axios from "axios";
import SocialDownloader from "../lib/SocialDownloader";

export function formatter(url: string, title: string, resourceURL: string, filename?: string) {
    return {
        url,
        title,
        resource: resourceURL,
        resources: [resourceURL],
        filename,
    };
}

export async function getMetadata(url: string) {
    const rules = {
        youtube: {
            exp: /youtube/gi,
            endpoint: "https://api.ryzendesu.vip/api/downloader/ytmp4",
            cb: async (data: any) => {
                // return formatter(url, data.title, data.url, data.filename);
                return await SocialDownloader.youtube(url);
            }
        },
        instagram: {
            exp: /instagram/gi,
            endpoint: "https://api.ryzendesu.vip/api/downloader/igdl",
            cb: async (data: any) => {
                // return formatter(url, "untitled", data.data[0].url);
                return await SocialDownloader.instagram(url);
            }
        },
        facebook: {
            exp: /facebook/gi,
            endpoint: "https://api.ryzendesu.vip/api/downloader/fbdl",
            cb: async (data: any) => {
                // return    formatter(data.url, data.title, data.video);
                return await SocialDownloader.facebook(url);
            }
        },
    };

    try {
        for (let key in rules) {
            const rule = rules[key as keyof typeof rules];

            if (rule.exp.test(url)) {
                let data = await rule.cb(url);

                if (!data) {
                    return false;
                }

                return data;

                // let { data } = await axios.get(rule.endpoint, {
                //     params: { url }
                // });
                // return rule.cb(data);
            }
        }
    } catch (error) {
        console.log({ error });
        return false;
    }
}

export async function download(url: string, dir: string, filename: string) {
    try {
        // Ensure the directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const filePath = path.join(dir, filename);
        const writer = fs.createWriteStream(filePath);

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filePath));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Download failed:', error);
        throw error;
    }
}


export async function mediadown(postURLs: string[]) {
    for await (let postURL of postURLs) {
        console.log("fetching: ", postURL);
        let metadata = await getMetadata(postURL);

        if (!metadata) {
            console.log("invalid url: ", postURL);
            continue;
        }

        console.log({ metadata });

        // let resources = metadata.resources;
        // let title = metadata.title;
        // let c = 1;

        // for await (let resource of resources) {
        //     let filename = title ? `${title}-${c}` : `${new Date().getTime()}.mp4`;
        //     let pathfile = path.resolve("./media");

        //     await download(resource, pathfile, filename);
        //     c++;
        // }
    }
    console.log("done");
}
