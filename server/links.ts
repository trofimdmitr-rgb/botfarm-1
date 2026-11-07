// Один человек — несколько мессенджеров. Аккаунты Telegram (id > 0) и MAX (id < 0) связываются в «человека»
// (users.person_id), и тогда записи видны в обоих, а уведомления приходят в оба.
//
// Связываем по номеру телефона, но ТОЛЬКО после подтверждения: когда аккаунт A указал номер, который уже есть
// у аккаунта B в другом мессенджере, мы спрашиваем B «Это вы?». Спрашиваем именно B (известного владельца номера):
// иначе любой ввёл бы чужой номер и увидел бы чужие записи.
import type { Db } from "./db.js";
import { esc, fmtWhen } from "./format.js";
import type { Btn } from "./max.js";

export const platformName = (id: number) => (id < 0 ? "MAX" : "Telegram");

/** Все аккаунты того же человека (включая сам id). */
export async function personIds(db: Db, id: number): Promise<number[]> {
  const rows = await db.query<{ tg_id: string | number }>(
    `select tg_id from users where coalesce(person_id, tg_id) = (select coalesce(person_id, tg_id) from users where tg_id = $1)`,
    [id],
  );
  const ids = rows.map((r) => Number(r.tg_id));
  return ids.length ? ids : [Number(id)];
}

export async function rememberPhone(db: Db, id: number, phone: string) {
  await db.query(`update users set phone = $2 where tg_id = $1`, [id, phone]);
}

export type LinkOffer = { requestId: number; toId: number; html: string; kb: Btn[][] };

/** Объединить аккаунты a и b в одного «человека». */
async function merge(db: Db, a: number, b: number) {
  await db.tx(async (t) => {
    const [p] = await t.query<{ p: string }>(`select coalesce(person_id, tg_id) as p from users where tg_id = $1`, [a]);
    const person = Number(p?.p ?? a);
    await t.query(
      `update users set person_id = $1 where tg_id = any($2::bigint[]) or coalesce(person_id, tg_id) in (
         select coalesce(person_id, tg_id) from users where tg_id = any($2::bigint[]))`,
      [person, [a, b]],
    );
  });
}

/** Отвязать аккаунт id от остальных; если в «человеке» остался один аккаунт — он снова сам по себе. */
async function detach(db: Db, id: number) {
  const ids = (await personIds(db, id)).filter((x) => x !== Number(id));
  await db.query(`update users set person_id = null where tg_id = $1`, [id]);
  if (ids.length === 1) await db.query(`update users set person_id = null where tg_id = $1`, [ids[0]]);
  else if (ids.length > 1) await db.query(`update users set person_id = $1 where tg_id = any($2::bigint[])`, [ids[0], ids]);
}

/**
 * Аккаунт fromId указал номер phone. Аккаунты с тем же номером в ДРУГОМ мессенджере связываем сразу и готовим им
 * оповещение с кнопкой «Это не я» (если номер указал кто-то чужой — одно нажатие разрывает связь).
 * Если в другом мессенджере человека нет — ничего не делаем.
 */
export async function autoLink(
  db: Db,
  fromId: number,
  phone: string,
  context?: { businessName: string; startsAt: string; timezone: string },
): Promise<LinkOffer[]> {
  const mine = await personIds(db, fromId);
  const candidates = await db.query<{ tg_id: string | number }>(
    `select u.tg_id from users u
     where u.phone = $1 and u.tg_id <> all($2::bigint[]) and sign(u.tg_id) <> sign($3::bigint)
       and not exists (
         select 1 from link_requests r
         where ((r.from_id = $3 and r.to_id = u.tg_id) or (r.from_id = u.tg_id and r.to_id = $3)) and r.status = 'declined'
       )
     limit 3`,
    [phone, mine, fromId],
  );
  const notices: LinkOffer[] = [];
  for (const c of candidates) {
    const toId = Number(c.tg_id);
    await merge(db, toId, fromId);
    const [req] = await db.query<{ id: string | number }>(
      `insert into link_requests (from_id, to_id, phone, status, answered_at) values ($1, $2, $3, 'accepted', now()) returning id`,
      [fromId, toId, phone],
    );
    const id = Number(req.id);
    const from = platformName(fromId);
    const what = context
      ? `В ${from} вы записались к «${esc(context.businessName)}» на <b>${esc(fmtWhen(context.startsAt, context.timezone))}</b>.`
      : `В ${from} указан ваш номер <code>${esc(phone)}</code>.`;
    notices.push({
      requestId: id,
      toId,
      html: [
        `<b>Запись из ${from}</b>`,
        what,
        "",
        `Аккаунты связаны по номеру <code>${esc(phone)}</code>: записи видны и здесь, и в ${from}, уведомления приходят в оба мессенджера.`,
        "<i>Если это были не вы — нажмите «Это не я».</i>",
      ].join("\n"),
      kb: [[{ text: "Это не я", cb: `lnk:${id}:n` }]],
    });
  }
  return notices;
}

/** «Это не я»: разорвать связь, сделанную по номеру, и больше эти два аккаунта не связывать. */
export async function answerLink(db: Db, requestId: number, answeredBy: number, yes: boolean): Promise<{ html: string; fromId?: number } | null> {
  const [r] = await db.query<{ from_id: string; to_id: string; status: string }>(`select from_id, to_id, status from link_requests where id = $1`, [requestId]);
  if (!r || Number(r.to_id) !== Number(answeredBy)) return null;
  if (yes) return { html: "Аккаунты связаны." };
  if (r.status === "declined") return { html: "Связь уже отменена." };
  await detach(db, Number(r.from_id));
  await db.query(`update link_requests set status = 'declined', answered_at = now() where id = $1`, [requestId]);
  return { html: "Связь отменена: записи из другого мессенджера здесь больше не видны, уведомления туда не приходят." };
}
