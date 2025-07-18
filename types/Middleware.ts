import { type WASocket, type proto } from "@whiskeysockets/baileys";

export interface Middleware {
  name: string;
  execute: (sock: WASocket, msg: proto.IWebMessageInfo) => Promise<boolean>;
  isAuth?: boolean;
}