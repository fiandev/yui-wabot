import { type Command } from "../../types/Command";
import UnexpectedError from "../exceptions/UnexpectedError";
import { getRandomCharImagePath } from "../utils/getRandomCharImagePath";
import { os } from "../utils/os";
import { time } from "../utils/time";
import fs from "fs";

export const ping: Command = {
  name: "ping",
  cmd: ["ping", "p", "?"],
  description: "Deskripsi ping",
  async execute(sock, msg) {
    try {
      let server = os();
      let now  = time();
  
      let text = `Pong!
  
  *Latency:* ${Number(Date.now() - Number(msg.messageTimestamp)).toFixed(2)} ms
  *Log Level:* ${sock.logger.level}
  *Server:* ${server.ip}
  *Platform:* ${server.platform}
  *Runtime:* ${server.runtime}
  *OS:* ${server.os}
  *CPU:* ${server.cpu}
  *Memory:* ${server.memory}
  *Uptime:* ${server.uptime}`;
  
  
      let imageBuffer = fs.readFileSync(getRandomCharImagePath());
  
      if (now.localeDay == "Jumat") {
        imageBuffer = fs.readFileSync("./assets/images/events/gak-jumatan.jpg");
      }
  
      await sock.sendMessage(msg.key.remoteJid!, 
        { 
          image: imageBuffer,
          caption: text
        }
      );
    } catch (err) {
      console.log(err);
      
      throw new UnexpectedError("Gagal menangani command ping");
    }
  },
};