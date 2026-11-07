// Telegram-бот: принимает обновления через вебхук (grammY), логика ответов — в flows.ts (общая с MAX).
import { Bot, type Context, InlineKeyboard } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { config, webAppUrl } from "./config.js";
import { db } from "./db.js";
import * as flows from "./flows.js";
import type { Btn } from "./max.js";
import * as store from "./store.js";

let bot: Bot | null = null;

/** Бот без запроса getMe на холодном старте: id берём из токена, username — из env. */
export function getBot(): Bot {
  if (bot) return bot;
  const botInfo = {
    id: Number(config.botToken.split(":")[0]),
    is_bot: true,
    first_name: config.botUsername,
    username: config.botUsername,
    can_join_groups: false,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: Boolean(config.botAppName),
  } as UserFromGetMe;
  bot = new Bot(config.botToken, { botInfo });
  register(bot);
  return bot;
}

/** Нейтральные кнопки → клавиатура Telegram. */
export function tgKeyboard(rows: Btn[][] | undefined): InlineKeyboard | undefined {
  if (!rows?.length) return undefined;
  const kb = new InlineKeyboard();
  rows.forEach((row, i) => {
    if (i) kb.row();
    for (const b of row) {
      if (b.app) kb.webApp(b.text, webAppUrl(b.app));
      else if (b.url) kb.url(b.text, b.url);
      else kb.text(b.text, b.cb ?? "");
    }
  });
  return kb;
}

async function send(ctx: Context, replies: flows.Reply | flows.Reply[]) {
  for (const r of Array.isArray(replies) ? replies : [replies]) {
    await ctx.reply(r.html, { parse_mode: "HTML", reply_markup: tgKeyboard(r.kb), link_preview_options: { is_disabled: true } });
    // нижняя кнопка «Записаться» в чате ведёт к последнему открытому бизнесу
    if (r.menuSlug) {
      await ctx.api
        .setChatMenuButton({ chat_id: ctx.chat!.id, menu_button: { type: "web_app", text: "Записаться", web_app: { url: webAppUrl({ b: r.menuSlug }) } } })
        .catch(() => {});
    }
  }
}

function register(b: Bot) {
  b.use(async (ctx, next) => {
    if (ctx.from && !ctx.from.is_bot) await store.upsertUser(db(), ctx.from);
    await next();
  });

  b.command("start", async (ctx) => send(ctx, await flows.onStart(ctx.from!, String(ctx.match ?? ""), "tg")));
  b.command("admin", async (ctx) => send(ctx, await flows.platformMenu(ctx.from!.id)));
  b.command("masters", async (ctx) => send(ctx, await flows.mastersList(ctx.from!.id)));
  b.callbackQuery("masters", async (ctx) => {
    await ctx.answerCallbackQuery();
    await send(ctx, await flows.mastersList(ctx.from.id));
  });
  b.command("help", (ctx) => send(ctx, flows.helpReply("tg")));
  // «Это вы?» — связка с аккаунтом MAX
  b.callbackQuery(/^lnk:(\d+):([yn])$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await send(ctx, await flows.onLinkAnswer(ctx.from.id, Number(ctx.match[1]), ctx.match[2] === "y"));
  });

  // Номер, которым клиент поделился из формы записи («Взять номер из Telegram»): сохраняем молча
  b.on("message:contact", async (ctx) => {
    const c = ctx.message.contact;
    if (c.user_id === ctx.from.id) await flows.onContact(ctx.from.id, c.phone_number);
  });

  b.on("message", async (ctx) => send(ctx, await flows.onOtherMessage(ctx.from.id)));

  b.on("my_chat_member", async (ctx) => {
    if (ctx.myChatMember.new_chat_member.status === "kicked") {
      await db().query(`update clients set blocked_bot = true where tg_id = $1`, [ctx.from.id]);
    }
  });

  b.catch((err) => console.error("bot error", err.error));
}
