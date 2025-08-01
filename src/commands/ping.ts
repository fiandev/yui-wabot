import moment from "moment";
import { type Command } from "../../types/Command";
import UnexpectedError from "../exceptions/UnexpectedError";
import { debugDB, ensureDB } from "../helpers/db";
import { getRandomCharImagePath } from "../utils/getRandomCharImagePath";
import { os } from "../utils/os";
import { time } from "../utils/time";
import fs from "fs";

export const ping: Command = {
  name: "ping",
  cmd: ["ping", "p", "?"],
  description: "test ping",
  async execute(sock, msg) {
    try {
      const db = ensureDB();
      let server = os();
      let now = time();
      let users = db.get("users");
      debugDB();
      server.memory = "16 GB";
      let text = `Pong!
  
  *Latency:* ${moment().diff(global.timestamp, "ms")} ms
  *Log Level:* ${sock.logger.level}
  *Registered Users:* ${users?.length || 0}
  *Server:* ${server.ip}
  *Platform:* ${server.platform}
  *Runtime:* ${server.runtime}
  *OS:* ${server.os}
  *CPU:* ${server.cpu}
  *Memory:* ${server.memory}
  *Uptime:* ${server.uptime}`;

      let imageBuffer = fs.readFileSync(getRandomCharImagePath());

      if (now.localeDay == "Jumat" && now.hour >= 10 && now.hour <= 12) {
        imageBuffer = fs.readFileSync("./assets/images/events/gak-jumatan.jpg");
      }

      await sock.sendMessage(msg.key.remoteJid!,
        {
          image: imageBuffer,
          caption: text
        },
        { quoted: msg }
      );
    } catch (err) {
      console.log(err);

      throw new UnexpectedError("Gagal menangani command ping");
    }
  },
};