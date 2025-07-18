import { type Command } from "../../../../types/Command";
import { parserArgumentConversation } from "../../../utils/parserArgumentConversation";

export const btcTx: Command = {
  name: "btc-tx",
  cmd: ["btc-tx", "btc-t", "btc-tx"],
  description: "Deskripsi btc-tx",
  async execute(sock, msg) {
    const args = parserArgumentConversation(msg.message?.conversation || "").args;
    const txHash = args[0];
    console.log(txHash);

    if (!txHash) {
      await sock.sendMessage(msg.key.remoteJid!, { text: "Please provide a transaction hash" });
      return;
    }
    
    
    
  },
};