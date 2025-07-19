import { ping } from "./commands/ping";
import { btcTx } from "./commands/blockchain/btc/tx";
import { sticker } from "./commands/sticker";
import { menu } from "./commands/menu";
import { batchSticker } from "./commands/batch-sticker";
import { batchSticker as batchStickerMiddleware } from "./middlewares/batchSticker";
import { register } from "./commands/auth/register";
import { unregister } from "./commands/auth/unreg";
import { cekjodoh } from "./commands/game/cekjodoh";
import { cekgay } from "./commands/game/cekgay";
import { kapankah } from "./commands/game/kapankah";
import { httrack } from "./commands/pro/httrack";

export const commands = [ping, btcTx, sticker, menu, batchSticker, register, unregister, cekjodoh, cekgay, kapankah, httrack];
export const middlewares = [batchStickerMiddleware];