import { Readable } from "stream";
import { tmpdir } from "os";
import { join } from "path";
import { createWriteStream, readFileSync, unlinkSync } from "fs";
import ffmpeg from "fluent-ffmpeg";
import { type WAMessage } from "@whiskeysockets/baileys";

class Sticker {
  public static async convertToSticker(message: WAMessage, stream: Readable): Promise<Buffer> {
    console.log('Sticker.convertToSticker: Starting conversion process.');
    const isVideo = message.message?.videoMessage;
    const filePath = join(tmpdir(), `sticker-${Date.now()}.webp`);
    console.log(`Sticker.convertToSticker: Temporary file path: ${filePath}`);

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
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
          .on("start", (commandLine) => {
            console.log(`Sticker.convertToSticker: FFmpeg command: ${commandLine}`);
          })
          .on("end", () => {
            console.log('Sticker.convertToSticker: FFmpeg processing finished.');
            resolve();
          })
          .on("error", (err, stdout, stderr) => {
            console.error('Sticker.convertToSticker: FFmpeg error:', err);
            console.error('Sticker.convertToSticker: FFmpeg stdout:', stdout);
            console.error('Sticker.convertToSticker: FFmpeg stderr:', stderr);
            reject(err);
          })
          .save(filePath);
      });
    } catch (error) {
      console.error('Sticker.convertToSticker: Error during FFmpeg promise:', error);
      throw error;
    }

    let webpBuffer: Buffer;
    try {
      webpBuffer = readFileSync(filePath);
      console.log('Sticker.convertToSticker: WebP file read into buffer.');
    } catch (error) {
      console.error('Sticker.convertToSticker: Error reading WebP file:', error);
      throw error;
    } finally {
      try {
        unlinkSync(filePath); // cleanup
        console.log('Sticker.convertToSticker: Temporary file unlinked.');
      } catch (unlinkError) {
        console.error('Sticker.convertToSticker: Error unlinking temporary file:', unlinkError);
      }
    }

    console.log('Sticker.convertToSticker: Conversion process completed.');
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
