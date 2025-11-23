import type { WASocket } from "@whiskeysockets/baileys";

export async function enableEphemeralTime(
  sock: WASocket,
  jid: string,
  seconds: number = 7776000,
) {
  try {
    // Ambil metadata grup
    const metadata = await sock.groupMetadata(jid);

    // Cek durasi ephemeral saat ini
    const current = metadata?.ephemeralDuration ?? 0;

    // Jika sudah sama → tidak perlu update
    if (current === seconds) {
      console.log("Ephemeral already enabled with same duration. Skipped.");
      return;
    }

    // Jika berbeda → update
    await sock.groupToggleEphemeral(jid, seconds);

    console.log(`Ephemeral updated to ${seconds} seconds.`);
  } catch (e) {
    console.error("Failed to enable ephemeral:", e);
  }
}
