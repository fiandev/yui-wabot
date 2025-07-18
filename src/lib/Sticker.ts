import { Readable } from "stream";
import { tmpdir } from "os";
import { join } from "path";
import { createWriteStream, readFileSync, unlinkSync } from "fs";
import ffmpeg from "fluent-ffmpeg";
import { type WAMessage } from "@whiskeysockets/baileys";

class Sticker {
  public static async convertToSticker(message: WAMessage, stream: Readable): Promise<Buffer> {
    const isVideo = !!message.message?.videoMessage;
    const filePath = join(tmpdir(), `sticker-${Date.now()}.webp`);

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg()
        .input(stream)
        .inputOptions(["-hide_banner"])
        .toFormat("webp")
        .outputOptions([
          "-loop", "0",
          "-qscale", "1",
          "-vsync", "0",
          ...(isVideo
            ? ["-preset", "default", "-an", "-vcodec", "libwebp", "-t", "10", "-r", "20"]
            : ["-vcodec", "libwebp"])
        ])
        .on("end", () => resolve())
        .on("error", reject)
        .save(filePath);
    });

    const webpBuffer = readFileSync(filePath);
    unlinkSync(filePath); // cleanup
    return webpBuffer;
  }

  public static async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }
}

export default Sticker;
