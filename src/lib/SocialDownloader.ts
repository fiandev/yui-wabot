import request from "request";
import youtubeDl from "youtube-dl";

export default class SocialDownloader {
    public static instagram(postUrl: string): Promise<any> {
        const split_url = postUrl.split("/");
        const ig_code = split_url[4];
        const url = `https://www.instagram.com/p/${ig_code}/?__a=1`;

        return new Promise((resolve, reject) => {
            request.get(url, (err: any, response: any, body: any) => {
                if (err) {
                    reject(new Error("Error on getting response"));

                } else {
                    let json = JSON.parse(body);

                    if (json.hasOwnProperty("graphql")) {
                        const { shortcode_media } = json.graphql;

                        const { __typename: postType } = shortcode_media;

                        if (
                            postType != "GraphImage" &&
                            postType != "GraphSidecar" &&
                            postType != "GraphVideo"
                        ) {
                            reject(new Error("No Post Type Found"));
                        } else {
                            const {
                                display_url: displayUrl,
                                edge_media_to_caption,
                            } = shortcode_media;

                            const { edges: captionCheck } = edge_media_to_caption;

                            const caption =
                                captionCheck.length == 1 ? captionCheck[0].node.text : "";

                            const {
                                username: owner,
                                is_verified,
                                profile_pic_url: profile_pic,
                                full_name,
                                is_private,
                                edge_owner_to_timeline_media,
                            } = shortcode_media.owner;

                            const total_media = edge_owner_to_timeline_media.count;
                            const hashtags = caption.match(/#\w+/g);

                            //GraphImage = single image post
                            if (postType === "GraphImage") {
                                const dataDownload = displayUrl;

                                resolve({
                                    status: "success",
                                    postType: "SingleImage",
                                    displayUrl,
                                    caption,
                                    owner,
                                    is_verified,
                                    profile_pic,
                                    full_name,
                                    is_private,
                                    total_media,
                                    hashtags,
                                    dataDownload,
                                });
                            }
                            //GraphSidecar = multiple post
                            else if (postType === "GraphSidecar") {
                                const dataDownload = [];

                                for (const post of shortcode_media.edge_sidecar_to_children
                                    .edges) {
                                    const { is_video, display_url, video_url } = post.node;

                                    const placeholder_url = !is_video
                                        ? display_url
                                        : video_url;

                                    dataDownload.push({
                                        is_video,
                                        placeholder_url,
                                    });
                                }

                                resolve({
                                    status: "success",
                                    postType: "MultiplePost",
                                    displayUrl,
                                    caption,
                                    owner,
                                    is_verified,
                                    profile_pic,
                                    full_name,
                                    is_private,
                                    total_media,
                                    hashtags,
                                    dataDownload,
                                });

                            }
                            //GraphVideo = video post
                            else if (postType === "GraphVideo") {
                                const dataDownload = shortcode_media.owner.videoUrl;

                                resolve({
                                    status: "success",
                                    postType: "SingleVideo",
                                    displayUrl,
                                    caption,
                                    owner,
                                    is_verified,
                                    profile_pic,
                                    full_name,
                                    is_private,
                                    total_media,
                                    hashtags,
                                    dataDownload,
                                });
                            }

                            reject(new Error("Post Type Not Found"));
                        }
                    } else {
                        reject(new Error("URL Failed"));
                    }
                }
            });
        });
    }

    public static youtube(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            youtubeDl.getInfo(url, (err: any, info: any) => {
                if (err) {
                    reject(new Error(err));

                } else {
                    if (info.hasOwnProperty("uploader_url")) {
                        const {
                            uploader_url: ownerUrl,
                            uploader_id: ownerId,
                            channel_url: channelUrl,
                            uploader,
                            view_count: totalViews,
                            id: urlId,
                            thumbnail,
                            description,
                            _filename: filename,
                            duration,
                            fulltitle: title,
                            categories,
                            formats,
                        } = info;

                        const dataFormats = [];

                        for (const currentFormat of formats) {
                            const {
                                formatId,
                                url: dataDownload,
                                format,
                                ext,
                                formatText,
                                filesize,
                                acodec,
                            } = currentFormat;

                            if (acodec === "none") {
                                continue;
                            }

                            dataFormats.push({
                                dataDownload,
                                format,
                                ext,
                                filesize,
                            });
                        }

                        resolve({
                            status: "success",
                            ownerUrl,
                            ownerId,
                            channelUrl,
                            uploader,
                            totalViews,
                            urlId,
                            thumbnail,
                            description,
                            filename,
                            duration,
                            title,
                            categories,
                            dataFormats,
                        });
                    } else {
                        reject(new Error("Failed, Please check the URL!"));
                    }
                }
            });
        });
    }

    public static facebook(url: string): Promise<any> {
        return new Promise((resolve, reject) => {

        })
    }
}
