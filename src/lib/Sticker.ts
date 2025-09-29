// import { Readable } from "stream";
// import { tmpdir } from "os";
// import { join } from "path";
// import { createWriteStream, readFileSync, unlinkSync } from "fs";
// import ffmpeg from "fluent-ffmpeg";
// import { type WAMessage } from "@whiskeysockets/baileys";

// class Sticker {
//   public static async convertToSticker(message: WAMessage, stream: Readable): Promise<Buffer> {
//     console.log('Sticker.convertToSticker: Starting conversion process.');
//     const isVideo = message.message?.videoMessage;
//     const filePath = join(tmpdir(), `sticker-${Date.now()}.webp`);
//     console.log(`Sticker.convertToSticker: Temporary file path: ${filePath}`);

//     try {
//       await new Promise<void>((resolve, reject) => {
//         const ffmpegPath = "/usr/bin/ffmpeg";

//         // Atur path ini untuk library fluent-ffmpeg
//         ffmpeg()
//           .setFfmpegPath(ffmpegPath)
//           .input(stream)
//           .inputOptions(["-hide_banner"])
//           .toFormat("webp")
//           .outputOptions([
//             "-loop", "0",
//             "-qscale", "1",
//             "-vsync", "0",
//             ...(isVideo
//               ? ["-preset", "default", "-an", "-vcodec", "libwebp", "-t", "10", "-r", "20"]
//               : ["-vcodec", "libwebp"])
//           ])
//           .on("start", (commandLine) => {
//             console.log(`Sticker.convertToSticker: FFmpeg command: ${commandLine}`);
//           })
//           .on("end", () => {
//             console.log('Sticker.convertToSticker: FFmpeg processing finished.');
//             resolve();
//           })
//           .on("error", (err, stdout, stderr) => {
//             console.error('Sticker.convertToSticker: FFmpeg error:', err);
//             console.error('Sticker.convertToSticker: FFmpeg stdout:', stdout);
//             console.error('Sticker.convertToSticker: FFmpeg stderr:', stderr);
//             reject(err);
//           })
//           .save(filePath);
//       });
//     } catch (error) {
//       console.error('Sticker.convertToSticker: Error during FFmpeg promise:', error);
//       throw error;
//     }

//     let webpBuffer: Buffer;
//     try {
//       webpBuffer = readFileSync(filePath);
//       console.log('Sticker.convertToSticker: WebP file read into buffer.');
//     } catch (error) {
//       console.error('Sticker.convertToSticker: Error reading WebP file:', error);
//       throw error;
//     } finally {
//       try {
//         unlinkSync(filePath); // cleanup
//         console.log('Sticker.convertToSticker: Temporary file unlinked.');
//       } catch (unlinkError) {
//         console.error('Sticker.convertToSticker: Error unlinking temporary file:', unlinkError);
//       }
//     }

//     console.log('Sticker.convertToSticker: Conversion process completed.');
//     return webpBuffer;
//   }

//   public static async streamToBuffer(stream: Readable): Promise<Buffer> {
//     return new Promise<Buffer>((resolve, reject) => {
//       const chunks: Buffer[] = [];
//       stream.on("data", (chunk) => chunks.push(chunk));
//       stream.on("end", () => resolve(Buffer.concat(chunks)));
//       stream.on("error", reject);
//     });
//   }
// }

// export default Sticker;


import { spawn } from "child_process"; // Mengimpor 'spawn'
import { Readable } from "stream";
import { tmpdir } from "os";
import { join } from "path";
import { readFileSync, unlinkSync } from "fs";
import { type WAMessage } from "@whiskeysockets/baileys";

// Library 'fluent-ffmpeg' tidak lagi dibutuhkan

class Sticker {
  public static async convertToSticker(message: WAMessage, stream: Readable): Promise<Buffer> {
    console.log('Sticker.convertToSticker: Starting conversion process using spawn.');
    const isVideo = !!message.message?.videoMessage;
    const filePath = join(tmpdir(), `sticker-${Date.now()}.webp`);
    console.log(`Sticker.convertToSticker: Temporary file path: ${filePath}`);

    try {
      await new Promise<void>((resolve, reject) => {
        // Mendefinisikan path ffmpeg secara eksplisit
        const ffmpegPath = "/usr/bin/ffmpeg";

        // Membangun argumen untuk command line ffmpeg
        const baseArgs = [
          '-hide_banner',
          '-i', '-',          // Membaca input dari stdin
          '-f', 'webp',       // Format output adalah webp
          '-loop', '0',
          '-qscale', '1',
          '-vsync', '0',
        ];

        const videoArgs = [
          '-preset', 'default',
          '-an',              // Tidak ada audio
          '-vcodec', 'libwebp',
          '-t', '10',         // Durasi maksimal 10 detik
          '-r', '20',         // Frame rate 20 fps
        ];

        const imageArgs = [
          '-vcodec', 'libwebp'
        ];

        // Menggabungkan argumen berdasarkan tipe media dan menambahkan path output di akhir
        const ffmpegArgs = [...baseArgs, ...(isVideo ? videoArgs : imageArgs), filePath];

        console.log(`Sticker.convertToSticker: Spawning FFmpeg with command: ${ffmpegPath} ${ffmpegArgs.join(' ')}`);

        // Menjalankan proses ffmpeg
        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);

        // Mengalirkan (pipe) stream media ke stdin proses ffmpeg
        stream.pipe(ffmpegProcess.stdin);

        // Menampung output dari stderr untuk debugging
        let stderrOutput = '';
        ffmpegProcess.stderr.on('data', (data) => {
          stderrOutput += data.toString();
        });

        // Menangani error saat proses gagal dimulai (misal: ENOENT)
        ffmpegProcess.on('error', (err) => {
          console.error('Sticker.convertToSticker: Failed to start FFmpeg process:', err);
          reject(err);
        });

        // Menangani saat proses selesai
        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            console.log('Sticker.convertToSticker: FFmpeg process finished successfully.');
            resolve();
          } else {
            console.error(`Sticker.convertToSticker: FFmpeg process exited with non-zero code: ${code}`);
            console.error('Sticker.convertToSticker: FFmpeg stderr:', stderrOutput);
            reject(new Error(`FFmpeg exited with code ${code}`));
          }
        });
      });
    } catch (error) {
      console.error('Sticker.convertToSticker: Error during FFmpeg promise:', error);
      throw error; // Lempar error lagi agar bisa ditangani di level atas
    }

    // Bagian ini sudah sempurna, tidak perlu diubah.
    let webpBuffer: Buffer;
    try {
      webpBuffer = readFileSync(filePath);
      console.log('Sticker.convertToSticker: WebP file read into buffer.');
    } catch (error) {
      console.error('Sticker.convertToSticker: Error reading WebP file:', error);
      throw error;
    } finally {
      try {
        unlinkSync(filePath); // Cleanup
        console.log('Sticker.convertToSticker: Temporary file unlinked.');
      } catch (unlinkError) {
        console.error('Sticker.convertToSticker: Error unlinking temporary file:', unlinkError);
      }
    }

    console.log('Sticker.convertToSticker: Conversion process completed.');
    return webpBuffer;
  }

  // Fungsi ini tidak perlu diubah, sudah sangat baik.
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
