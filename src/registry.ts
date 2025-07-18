import { ping } from "./commands/ping";
import { btcTx } from "./commands/blockchain/btc/tx";
import { sticker } from "./commands/sticker";
import { menu } from "./commands/menu";
import { batchSticker } from "./commands/batch-sticker";
import { batchSticker as batchStickerMiddleware } from "./middlewares/batchSticker";

export const commands = [ping, btcTx, sticker, menu, batchSticker];
export const middlewares = [batchStickerMiddleware];