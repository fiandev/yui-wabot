import { bot } from "../config/bot";

export function parserArgumentConversation (conversation: string) {
    const args = conversation
        .replace(bot.prefix, "")
        .trim()
        .split(" ");
    const command = args.shift();
    
    return { command, args };
}
