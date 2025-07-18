import { type WASocket, type proto } from "@whiskeysockets/baileys";

export interface Command {
  name: string;
  description: string;
  usage?: string;
  cmd: string[];
  category?: string;
  isMedia?: boolean;
  execute: (sock: WASocket, msg: proto.IWebMessageInfo) => Promise<void>;
}