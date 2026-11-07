// Логика бота, общая для Telegram и MAX: что ответить на /start, ссылки, «Мои мастера», любое сообщение.
// Ответ — HTML-текст и нейтральные кнопки (Btn); bot.ts и maxbot.ts переводят их в кнопки своей платформы.
import type { TgUser } from "./auth.js";
import { adminLink, clientLink, config, maxAdminLink, maxClientLink } from "./config.js";
import { db } from "./db.js";
import { esc } from "./format.js";
import type { Btn } from "./max.js";
import { checkPhone } from "./phone.js";
import * as store from "./store.js";
import { UserError } from "./store.js";

export type Platform = "tg" | "max";
export type Reply = { html: string; kb?: Btn[][]; menuSlug?: string };

const isSuper = (id: number) => config.superadmins.includes(id);
const nameLink = (u: TgUser, platform: Platform) =>
  platform === "tg" ? `<a href="tg://user?id=${u.id}">${esc(u.first_name)}</a>` : `${esc(u.first_name)} (MAX)`;

export async function businessCard(uid: number, b: store.Business): Promise<Reply> {
  const s = b.settings;
  const kb: Btn[][] = [[{ text: "Записаться онлайн", app: { b: b.slug } }], [{ text: "Мои записи", app: { b: b.slug, view: "my" } }]];
  // у кого несколько мастеров — кнопка ко всему списку; суперадмину — вход в панель платформы
  const others = (await store.businessesOfClient(db(), uid)).filter((x) => x.id !== b.id);
  if (others.length) kb.push([{ text: "Другие мастера", cb: "masters" }]);
  if (isSuper(uid)) kb.push([{ text: "Панель платформы", app: { view: "super" } }]);
  const lines = [`<b>${esc(b.name)}</b>`, "", esc(s.welcome)];
  const info = [s.address && `<i>Адрес:</i> ${esc(s.address)}`, s.contactPhone && `<i>Телефон:</i> <code>${esc(s.contactPhone)}</code>`].filter(Boolean);
  if (info.length) lines.push("", ...(info as string[]));
  return { html: lines.join("\n"), kb, menuSlug: b.slug };
}

export async function platformMenu(uid: number): Promise<Reply> {
  const adminOf = await store.businessesOfAdmin(db(), uid);
  const kb: Btn[][] = adminOf.slice(0, 5).map((b) => [{ text: `Панель: ${b.name}`, app: { b: b.slug, view: "admin" } }]);
  if (isSuper(uid)) kb.push([{ text: "Панель платформы", app: { view: "super" } }]);
  if (adminOf.length || isSuper(uid)) return { html: "Выберите, что открыть:", kb };
  return { html: ["<b>Онлайн-запись</b>", "", "Чтобы записаться, откройте ссылку вашего мастера — и здесь появится запись к нему."].join("\n") };
}

/** Все бизнесы, куда человек записывался или заходил, — переключение одним нажатием. */
export async function mastersList(uid: number): Promise<Reply> {
  const list = await store.businessesOfClient(db(), uid);
  if (!list.length) return { html: "Здесь появятся мастера, к которым вы записывались. Откройте ссылку мастера, чтобы записаться." };
  return {
    html: "<b>Ваши мастера</b>\n<i>Выберите, к кому записаться или посмотреть записи.</i>",
    kb: list.map((b) => [{ text: b.name, app: { b: b.slug } }]),
  };
}

/** /start с параметром или без. Возвращает ответы по порядку (обычно один). */
export async function onStart(user: TgUser, payloadRaw: string, platform: Platform): Promise<Reply[]> {
  const payload = payloadRaw.trim();
  const uid = user.id;

  if (payload.startsWith("inv_")) {
    try {
      const { business, role } = await store.claimInvite(db(), payload.slice(4), uid);
      await store.setLastBusiness(db(), uid, business.id);
      const client = platform === "tg" ? clientLink(business.slug) : maxClientLink(business.slug);
      const admin = platform === "tg" ? adminLink(business.slug) : maxAdminLink(business.slug);
      if (role === "owner") {
        const { notifySuperadmins } = await import("./notify.js");
        await notifySuperadmins(`<b>Приглашение принято:</b> «${esc(business.name)}» → ${nameLink(user, platform)}`);
      }
      return [
        {
          html: [
            `<b>Готово.</b> Вы ${role === "owner" ? "владелец" : "администратор"} «${esc(business.name)}».`,
            "",
            "В панели можно поменять услуги, цены, график и тексты.",
            "",
            "<b>Ссылка для клиентов</b>",
            "<i>Поставьте её в шапку канала, Instagram и в ответы клиентам:</i>",
            `<code>${esc(client)}</code>`,
            "",
            "<b>Ваша ссылка на панель управления</b>",
            "<i>Сохраните её. У других людей она откроет обычную запись.</i>",
            `<code>${esc(admin)}</code>`,
          ].join("\n"),
          kb: [[{ text: "Открыть панель управления", app: { b: business.slug, view: "admin" } }]],
        },
      ];
    } catch (e) {
      return [{ html: e instanceof UserError ? esc(e.message) : "Не удалось принять приглашение" }];
    }
  }

  // постоянная ссылка на панель: открывает управление только тем, у кого есть роль
  if (payload.startsWith("adm_")) {
    const business = await store.getBusiness(db(), payload.slice(4));
    if (!business) return [await platformMenu(uid)];
    const role = await store.roleFor(db(), uid, business.id, config.superadmins);
    await store.setLastBusiness(db(), uid, business.id);
    if (!role) {
      await store.touchClient(db(), business.id, user);
      return [await businessCard(uid, business)];
    }
    return [
      {
        html: `<b>Панель управления</b> · ${esc(business.name)}`,
        kb: [[{ text: "Открыть панель управления", app: { b: business.slug, view: "admin" } }], [{ text: "Как видят клиенты", app: { b: business.slug } }]],
      },
    ];
  }

  if (payload) {
    const business = await store.getBusiness(db(), payload);
    if (business && business.status === "active") {
      await store.setLastBusiness(db(), uid, business.id);
      const role = await store.roleFor(db(), uid, business.id, config.superadmins);
      if (!role) await store.touchClient(db(), business.id, user);
      return [await businessCard(uid, business)];
    }
    if (business) return [{ html: "Запись в этот бизнес временно недоступна." }];
  }

  if (!payload && !isSuper(uid)) {
    const mine = await store.businessesOfClient(db(), uid, 2);
    if (mine.length > 1) return [await mastersList(uid)];
  }
  const [u] = await db().query(`select last_business_id from users where tg_id = $1`, [uid]);
  if (u?.last_business_id && !payload) {
    const business = await store.getBusiness(db(), Number(u.last_business_id));
    if (business?.status === "active") return [await businessCard(uid, business)];
  }
  return [await platformMenu(uid)];
}

export const helpReply = (platform: Platform): Reply => ({
  html:
    `Запись, отмена и перенос — в приложении (кнопка «Записаться»).\n/start — главное меню\n/masters — мои мастера\n/admin — панель для владельцев бизнеса` +
    (platform === "max" ? "\n/id — ваш id в MAX" : ""),
});

/** Любое другое сообщение: бот не читает переписку, подсказываем контакты бизнеса и кнопку записи. */
export async function onOtherMessage(uid: number): Promise<Reply> {
  const [u] = await db().query(`select last_business_id from users where tg_id = $1`, [uid]);
  const business = u?.last_business_id ? await store.getBusiness(db(), Number(u.last_business_id)) : null;
  if (!business) return platformMenu(uid);
  const s = business.settings;
  const contacts = [s.contactPhone && `<i>Телефон:</i> <code>${esc(s.contactPhone)}</code>`, ...s.links.map((l) => `<a href="${esc(l.url)}">${esc(l.title)}</a>`)]
    .filter(Boolean)
    .join("\n");
  return {
    html: `Я бот онлайн-записи «${esc(business.name)}» и не читаю переписку.${contacts ? `\n\n<b>Связаться напрямую</b>\n${contacts}` : ""}`,
    kb: [[{ text: "Записаться", app: { b: business.slug } }]],
  };
}

/** Номер, которым клиент поделился («Взять номер из …»): сохраняем молча в карточку клиента последнего бизнеса. */
export async function onContact(uid: number, rawPhone: string) {
  const pc = checkPhone(rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`);
  if (!pc.ok) return;
  const [u] = await db().query(`select last_business_id from users where tg_id = $1`, [uid]);
  if (u?.last_business_id) {
    await db().query(`update clients set phone = $3 where business_id = $1 and tg_id = $2`, [u.last_business_id, uid, pc.phone]);
  }
  // номер подтверждён мессенджером — запоминаем и связываем с аккаунтом в другом мессенджере (если он есть)
  try {
    const { rememberPhone, autoLink } = await import("./links.js");
    const { sendLinkOffers } = await import("./notify.js");
    await rememberPhone(db(), uid, pc.phone);
    await sendLinkOffers(await autoLink(db(), uid, pc.phone));
  } catch (e) {
    console.error("link on contact", e);
  }
}

/** Кнопка «Это не я» под оповещением о связке (lnk:<id>:n). */
export async function onLinkAnswer(uid: number, requestId: number, yes: boolean): Promise<Reply> {
  const { answerLink } = await import("./links.js");
  const res = await answerLink(db(), requestId, uid, yes);
  return { html: res ? res.html : "Эта кнопка не для вас." };
}
