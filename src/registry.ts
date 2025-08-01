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
import { ai } from "./commands/pro/ai";
import { autoReply as autoReplyMiddleware } from "./middlewares/autoReply";
import { toggleAutoReply } from "./commands/pro/toggleAutoReply";
import { downloader } from "./commands/pro/downloader";
import { premium } from "./commands/sudo/premium";
import { forexCalendar } from "./commands/pro/forexCalendar";
import { me } from "./commands/auth/me";

export const commands = [
    ping,
    btcTx,
    sticker,
    menu,
    batchSticker,
    register,
    unregister,
    cekjodoh,
    cekgay,
    kapankah,
    httrack,
    ai,
    toggleAutoReply,
    downloader,
    premium,
    me,
    forexCalendar,
];

export const middlewares = [
    batchStickerMiddleware,
    autoReplyMiddleware
];