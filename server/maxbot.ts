// Бот в MAX: вебхук /api/max. Логика ответов та же, что в Telegram (flows.ts).
import type { TgUser } from "./auth.js";
import { db } from "./db.js";
import * as flows from "./flows.js";
import { fromMaxUserId, maxAnswerCallback, maxSend } from "./max.js";
import * as store from "./store.js";

type MaxUser = { user_id: number; first_name?: string; last_name?: string; username?: string; is_bot?: boolean };

/** Пользователь MAX в «общем» виде: id отрицательный, чтобы не пересекаться с Telegram. */
export const maxUserToTg = (u: MaxUser): TgUser => ({
  id: fromMaxUserId(u.user_id),
  first_name: u.first_name || u.username || "Гость",
  last_name: u.last_name || undefined,
  username: u.username || undefined,
});

async function reply(uid: number, replies: flows.Reply | flows.Reply[]) {
  for (const r of Array.isArray(replies) ? replies : [replies]) await maxSend(uid, r.html, r.kb ?? []);
}

/** Обработать одно обновление MAX. Ошибки отправки не роняют вебхук — MAX не должен повторять доставку бесконечно. */
export async function handleMaxUpdate(update: any): Promise<void> {
  const type: string = update?.update_type ?? "";

  if (type === "bot_started") {
    const user = maxUserToTg(update.user);
    await store.upsertUser(db(), user);
    await reply(user.id, await flows.onStart(user, String(update.payload ?? ""), "max"));
    return;
  }

  if (type === "message_callback") {
    const cb = update.callback ?? {};
    const user = maxUserToTg(cb.user);
    await store.upsertUser(db(), user);
    await maxAnswerCallback(String(cb.callback_id ?? ""));
    if (cb.payload === "masters") await reply(user.id, await flows.mastersList(user.id));
    const lnk = /^lnk:(\d+):([yn])$/.exec(String(cb.payload ?? ""));
    if (lnk) await reply(user.id, await flows.onLinkAnswer(user.id, Number(lnk[1]), lnk[2] === "y"));
    return;
  }

  if (type === "message_created") {
    const msg = update.message ?? {};
    // только личные сообщения от людей; в группах бот молчит
    if (!msg.sender || msg.sender.is_bot || (msg.recipient?.chat_type && msg.recipient.chat_type !== "dialog")) return;
    const user = maxUserToTg(msg.sender);
    await store.upsertUser(db(), user);
    const text: string = String(msg.body?.text ?? "").trim();

    // контакт из кнопки «Поделиться номером»: берём только СВОЙ контакт (max_info.user_id = отправитель)
    const contact = (msg.body?.attachments ?? []).find((a: any) => a?.type === "contact");
    if (contact) {
      const own = contact.payload?.max_info?.user_id;
      if (own != null && Number(own) !== Number(msg.sender.user_id)) return;
      const vcf: string = contact.payload?.vcf_info ?? "";
      const phone = vcf.match(/TEL[^:]*:([+\d\s()-]+)/i)?.[1]?.replace(/[^\d+]/g, "");
      const r = phone ? await flows.onContact(user.id, phone) : null;
      if (r) await reply(user.id, r);
      return;
    }

    const [cmd, ...rest] = text.split(/\s+/);
    switch (cmd?.toLowerCase()) {
      case "/start":
        return reply(user.id, await flows.onStart(user, rest.join(" "), "max"));
      case "/masters":
        return reply(user.id, await flows.mastersList(user.id));
      case "/admin":
        return reply(user.id, await flows.platformMenu(user.id));
      case "/help":
        return reply(user.id, flows.helpReply("max"));
      case "/id":
        // чтобы добавить человека из MAX в суперадмины: insert into platform_admins(tg_id, note) values (<этот id>, ...)
        return reply(user.id, { html: `Ваш id в MAX: <code>${-user.id}</code>\nВнутренний id в системе: <code>${user.id}</code>` });
      default:
        return reply(user.id, await flows.onOtherMessage(user.id));
    }
  }
}
