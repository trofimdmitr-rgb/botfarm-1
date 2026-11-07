import { type Db, db as globalDb } from "./db.js";
import { personIds, platformName, type LinkOffer } from "./links.js";
import { config, webAppUrl } from "./config.js";
import { esc, fmtWhen, relDay, fmtTime, rub } from "./format.js";
import type { Booking, Business } from "./store.js";
import { isBlockedError, tg } from "./telegram.js";

const webAppButton = (text: string, url: string) => ({ reply_markup: { inline_keyboard: [[{ text, web_app: { url } }]] } });

/**
 * Отправка, которая никогда не роняет запись/бота: человек заблокировал бота, ни разу его не запускал,
 * в MAX не подключён бот — просто пропускаем (и не засоряем логи ожидаемыми случаями).
 */
async function safeSend(chatId: number, html: string, extra?: Record<string, unknown>): Promise<boolean> {
  if (Number(chatId) < 0 && !config.maxBotToken) return false;
  try {
    await tg().sendMessage(chatId, html, extra);
    return true;
  } catch (e) {
    if (!isBlockedError(e)) console.error("sendMessage", chatId, e);
    return false;
  }
}

/**
 * Сообщение клиенту — во ВСЕ его связанные мессенджеры (Telegram и MAX). В «чужом» мессенджере
 * добавляем пометку, откуда пришла запись.
 */
async function toClient(db: Db, clientId: number, html: string, extra?: Record<string, unknown>) {
  const ids = await personIds(db, Number(clientId)).catch(() => [Number(clientId)]);
  const origin = platformName(Number(clientId));
  await Promise.all(
    ids.map((id) => safeSend(id, platformName(id) === origin ? html : `${html}\n\n<i>Запись сделана через ${origin}.</i>`, extra)),
  );
}

/** Вопросы «Это вы?» в другой мессенджер (см. links.ts). */
export async function sendLinkOffers(offers: LinkOffer[]) {
  for (const o of offers) {
    const inline_keyboard = o.kb.map((row) => row.map((b) => ({ text: b.text, callback_data: b.cb ?? "" })));
    await safeSend(o.toId, o.html, { reply_markup: { inline_keyboard } });
  }
}

/** Сообщение одному аккаунту (для ответов вне контекста бота). */
export const sendTo = (id: number, html: string) => safeSend(id, html);

async function adminRecipients(db: Db, businessId: number, staffId?: number): Promise<number[]> {
  const rows = await db.query<{ tg_id: number }>(
    `select tg_id from business_admins where business_id = $1
     union select tg_id from staff where id = $2 and tg_id is not null`,
    [businessId, staffId ?? 0],
  );
  return rows.map((r) => Number(r.tg_id));
}

/** Строка «Подпись: значение» — подпись курсивом, без эмодзи. */
const row = (label: string, value: string) => `<i>${esc(label)}:</i> ${value}`;

/** Телефон моноширинным — в Telegram он копируется по нажатию. */
const phoneHtml = (p: string) => `<code>${esc(p)}</code>`;

/** Карточка записи в цитате: дата и время жирным, ниже услуга, цена, мастер, ответы на вопросы. */
function bookingCard(b: Booking, biz: Business, staffName?: string): string {
  const lines = [
    `<b>${esc(fmtWhen(b.starts_at, biz.timezone))}</b>`,
    `${esc(b.service_title)}${b.price ? ` — ${rub(b.price)}` : ""}`,
    staffName && biz.settings.chooseStaff ? row(biz.settings.labels.staff, esc(staffName)) : "",
    ...biz.settings.fields.filter((f) => b.answers?.[f.key]).map((f) => row(f.label, esc(b.answers[f.key]))),
  ].filter(Boolean);
  return `<blockquote>${lines.join("\n")}</blockquote>`;
}

const staffName = async (db: Db, id: number) =>
  (await db.query<{ name: string }>(`select name from staff where id = $1`, [id]))[0]?.name;

/** Пустая строка-отступ между блоками сообщения. */
const GAP = "\u0000";
const join = (parts: (string | false | null | undefined)[]) =>
  parts
    .filter((x): x is string => typeof x === "string" && x !== "")
    .map((x) => (x === GAP ? "" : x))
    .join("\n");

export async function onBookingCreated(db: Db, biz: Business, b: Booking) {
  const sName = await staffName(db, b.staff_id);
  const adminText = join([
    `<b>Новая запись</b> · ${esc(biz.name)}`,
    bookingCard(b, biz, sName),
    row("Клиент", `<b>${esc(b.client_name)}</b>`),
    b.client_phone && row("Телефон", phoneHtml(b.client_phone)),
    b.comment && row("Комментарий", esc(b.comment)),
    GAP,
    b.client_tg_id < 0 ? "<i>Клиент записался через MAX</i>" : `<a href="tg://user?id=${b.client_tg_id}">Написать клиенту в Telegram</a>`,
  ]);
  const adminKb = webAppButton("Открыть записи", webAppUrl({ b: biz.slug, view: "admin" }));
  await Promise.all((await adminRecipients(db, biz.id, b.staff_id)).map((id) => safeSend(id, adminText, adminKb)));

  const clientText = join([
    `<b>Вы записаны</b> · ${esc(biz.name)}`,
    bookingCard(b, biz, sName),
    biz.settings.address && row("Адрес", esc(biz.settings.address)),
    biz.settings.contactPhone && row("Телефон", phoneHtml(biz.settings.contactPhone)),
    biz.settings.afterBookingText && GAP,
    biz.settings.afterBookingText && `<i>${esc(biz.settings.afterBookingText)}</i>`,
  ]);
  await toClient(db, b.client_tg_id, clientText + (await otherMessengerHint(db, b.client_tg_id, biz.slug)), webAppButton("Мои записи", webAppUrl({ b: biz.slug, view: "my" })));
}

/** «Получать напоминания и в MAX/Telegram» — если во втором мессенджере у человека аккаунта ещё нет. */
async function otherMessengerHint(db: Db, clientId: number, slug: string): Promise<string> {
  try {
    const ids = await personIds(db, Number(clientId));
    const fromMax = Number(clientId) < 0;
    if (ids.some((id) => (id < 0) !== fromMax)) return ""; // уже есть в обоих
    if (fromMax && config.botUsername) {
      return `\n\n<a href="https://t.me/${config.botUsername}?start=${slug}">Получать напоминания и в Telegram</a>`;
    }
    if (!fromMax && config.maxBotToken && config.maxBotName) {
      return `\n\n<a href="https://max.ru/${config.maxBotName}?start=${slug}">Получать напоминания и в MAX</a>`;
    }
  } catch {}
  return "";
}

export async function onBookingCancelled(db: Db, biz: Business, b: Booking) {
  const sName = await staffName(db, b.staff_id);
  if (b.cancelled_by === "client") {
    const text = join([
      `<b>Клиент отменил запись</b> · ${esc(biz.name)}`,
      `<blockquote><s>${esc(fmtWhen(b.starts_at, biz.timezone))}</s>\n${esc(b.service_title)}</blockquote>`,
      row("Клиент", `<b>${esc(b.client_name)}</b>`),
      b.client_phone && row("Телефон", phoneHtml(b.client_phone)),
      GAP,
      "<i>Это время снова свободно для записи.</i>",
    ]);
    await Promise.all((await adminRecipients(db, biz.id, b.staff_id)).map((id) => safeSend(id, text)));
  } else {
    const text = join([
      `<b>Запись отменена</b> · ${esc(biz.name)}`,
      `<blockquote><s>${esc(fmtWhen(b.starts_at, biz.timezone))}</s>\n${esc(b.service_title)}</blockquote>`,
      "Извините за неудобство. Выберите, пожалуйста, другое время — будем рады вас видеть.",
    ]);
    await toClient(db, b.client_tg_id, text, webAppButton("Записаться снова", webAppUrl({ b: biz.slug })));
  }
}

export async function sendReminder(biz: Business, b: Booking, kind: "24h" | "2h", now = new Date()) {
  const when = `${relDay(b.starts_at, biz.timezone, now)} в ${fmtTime(b.starts_at, biz.timezone)}`;
  const text = join([
    kind === "2h" ? `<b>Скоро визит — ${esc(when)}</b>` : `<b>Напоминаем о записи — ${esc(when)}</b>`,
    `<blockquote>${esc(biz.name)}\n${esc(b.service_title)}</blockquote>`,
    biz.settings.address && row("Адрес", esc(biz.settings.address)),
    GAP,
    kind === "24h" ? "<i>Если планы изменились — отмените запись, чтобы время досталось другому.</i>" : "До встречи!",
  ]);
  await toClient(globalDb(), b.client_tg_id, text, webAppButton("Мои записи", webAppUrl({ b: biz.slug, view: "my" })));
  return true;
}

export async function notifySuperadmins(html: string) {
  await Promise.all(config.superadmins.map((id) => safeSend(id, html)));
}

/** Рассылка клиентам бизнеса. ~25 сообщений/с — в пределах лимитов Telegram. */
export async function broadcast(db: Db, biz: Business, text: string): Promise<{ sent: number; failed: number }> {
  const clients = await db.query<{ tg_id: number }>(
    `select tg_id from clients where business_id = $1 and not blocked_bot order by last_seen desc limit 2000`,
    [biz.id],
  );
  const html = `<b>${esc(biz.name)}</b>\n\n${esc(text)}`;
  const kb = webAppButton("Записаться", webAppUrl({ b: biz.slug }));
  let sent = 0;
  let failed = 0;
  const blocked: number[] = [];
  for (let i = 0; i < clients.length; i += 25) {
    const batch = clients.slice(i, i + 25);
    const res = await Promise.all(batch.map((c) => safeSend(Number(c.tg_id), html, kb)));
    res.forEach((ok, j) => {
      if (ok) sent++;
      else {
        failed++;
        blocked.push(Number(batch[j].tg_id));
      }
    });
    if (i + 25 < clients.length) await new Promise((r) => setTimeout(r, 1100));
  }
  if (blocked.length) {
    await db.query(`update clients set blocked_bot = true where business_id = $1 and tg_id = any($2::bigint[])`, [
      biz.id,
      blocked,
    ]);
  }
  return { sent, failed };
}
