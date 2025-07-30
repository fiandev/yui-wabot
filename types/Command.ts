import { type WASocket, type proto } from "@whiskeysockets/baileys";
import type Authenticate from "../src/lib/Authenticate";

export interface Command {
  name: string;
  description: string;
  usage?: string;
  cmd: string[];
  category?: string;
  isMedia?: boolean;
  isOnlyOwner?: boolean;
  isOnlyGroup?: boolean;
  isPremium?: boolean;
  isAuth?: boolean;
  execute: (sock: WASocket, msg: proto.IWebMessageInfo, args?: string[], auth?: Authenticate) => Promise<void>;
}