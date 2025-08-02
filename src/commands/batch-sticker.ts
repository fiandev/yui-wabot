import { type Command } from "../../types/Command";

export const batchSticker: Command = {
  name: "batch-sticker",
  description: "Toggle batch sticker mode",
  cmd: ["batch-sticker", "bs", "bst", "sticker-batch", "sbatch"],
  isMedia: true,
  category: "tools",
  async execute(sock, msg) {
    let batch = global.db.get("batchModes") || [];
    const jid = msg.key.remoteJid!;

    if (!batch.includes(jid)) {
      batch.push(jid);
      global.db.set("batchModes", batch);
      await sock.sendMessage(jid, { text: "✅ Batch sticker mode aktif. semua pesan gambar akan diubah menjadi sticker." });
    } else {
      batch = batch.splice(batch.indexOf(jid), 1);
      global.db.set("batchModes", batch);
      await sock.sendMessage(jid, { text: "Batch sticker mode dinonaktifkan." });
    }
  },
};