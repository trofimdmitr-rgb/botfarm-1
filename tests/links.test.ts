// Один человек в Telegram и MAX: связка по номеру сразу, во второй мессенджер — оповещение с кнопкой «Это не я».
import { beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb } from "../server/pglite";
import { db, setDb } from "../server/db";
import { setSender } from "../server/telegram";
import { dispatch } from "../server/rpc";
import { onContact, onLinkAnswer, onStart } from "../server/flows";
import { setMaxApi } from "../server/max";
import { handleMaxUpdate } from "../server/maxbot";
import { upsertUser } from "../server/store";
import type { InitData } from "../server/auth";
import { createHmac } from "node:crypto";
import { groupClients } from "../server/rpc";

process.env.BOT_TOKEN = "123:TEST";
process.env.BOT_USERNAME = "farm_test_bot";
process.env.SUPERADMIN_IDS = "1";
process.env.PUBLIC_URL = "https://farm.example";
process.env.MAX_BOT_TOKEN = "max-test-token";
process.env.MAX_BOT_USERNAME = "compot_max_bot";

let sent: { chatId: number; html: string; extra?: any }[] = [];
const as = (id: number): { init: InitData } => ({ init: { user: { id, first_name: `U${id}` }, authDate: 0 } });
const call = (method: string, params: Record<string, unknown>, id = 1) => dispatch(method, params, as(id));

const TG = 300; // Аня в Telegram
const MAX = -555; // она же в MAX
const PHONE = "+7 927 123-45-67";
let biz: any;

/** Подписанный ответ requestContact — как его присылает Telegram («Взять номер из Telegram»). */
function contactProof(userId: number, phone: string) {
  const params = new URLSearchParams({
    contact: JSON.stringify({ phone_number: phone.replace(/\D/g, "").replace(/^8/, "7"), user_id: userId }),
    auth_date: String(Math.floor(Date.now() / 1000)),
  });
  const dc = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = createHmac("sha256", "WebAppData").update("123:TEST").digest();
  params.set("hash", createHmac("sha256", secret).update(dc).digest("hex"));
  return params.toString();
}

/**
 * Записаться. verify — номер подтверждён мессенджером: в Telegram — подписанный контакт вместе с записью,
 * в MAX — контакт, присланный боту (кнопка «Поделиться номером») до записи.
 */
async function bookAs(id: number, phone = PHONE, nth = 0, verify = true) {
  await upsertUser(db(), { id, first_name: `U${id}` });
  if (verify && id < 0) await onContact(id, phone.replace(/\D/g, "").replace(/^8/, "7"));
  const cat: any = await call("boot", { slug: biz.slug }, id);
  const service = cat.business.services[0];
  const av: any = await call("availability", { businessId: biz.id, serviceId: service.id }, id);
  // не сегодня: до записи должно быть больше часов, чем запрет на отмену
  const day = Object.keys(av).filter((d) => av[d].length > nth)[1];
  const slot = av[day][nth];
  const phoneProof = verify && id > 0 ? contactProof(id, phone) : undefined;
  return call("book", { businessId: biz.id, serviceId: service.id, start: slot.start, name: "Аня", phone, phoneProof }, id) as Promise<any>;
}

const noticeTo = (id: number) => sent.find((m) => m.chatId === id && /^<b>Запись из /.test(m.html));
const requestIdOf = (m: { extra?: any }) => Number(/^lnk:(\d+):n$/.exec(m.extra.reply_markup.inline_keyboard[0][0].callback_data)![1]);
const myCount = async (id: number) => ((await call("myBookings", { businessId: biz.id }, id)) as any[]).length;

beforeEach(async () => {
  setDb(await createPgliteDb());
  sent = [];
  setSender({
    sendMessage: async (chatId, html, extra) => void sent.push({ chatId: Number(chatId), html, extra }),
    sendPhoto: async () => ({ file_id: "F" }),
    setChatMenuButton: async () => ({}),
  });
  biz = ((await call("super.create", { templateId: "beauty", name: "Ногти Анны" })) as any).business;
});

describe("связка Telegram ↔ MAX", () => {
  it("человека во втором мессенджере нет — запись проходит как обычно, ничего лишнего не отправляем", async () => {
    await expect(bookAs(TG, PHONE, 0)).resolves.toHaveProperty("id");
    expect(sent.some((m) => m.chatId < 0)).toBe(false);
    expect(await myCount(TG)).toBe(1);
  });

  it("запись в Telegram с подтверждённым номером, который уже подтверждён в MAX → связаны сразу, в MAX оповещение; записи видны в обоих", async () => {
    const maxBooked = await bookAs(MAX, "89271234567", 0); // тот же номер в другом виде, подтверждён в MAX
    sent = [];
    await bookAs(TG, PHONE, 1);

    const notice = noticeTo(MAX)!;
    expect(notice, "в MAX пришло оповещение").toBeTruthy();
    expect(notice.html).toContain("В Telegram вы записались к «Ногти Анны»");
    expect(notice.extra.reply_markup.inline_keyboard[0][0].text).toBe("Это не я");

    // без подтверждения: обе записи сразу видны в обоих мессенджерах
    expect(await myCount(MAX)).toBe(2);
    expect(await myCount(TG)).toBe(2);
    // и отменить запись, сделанную в MAX, можно из Telegram
    await expect(call("cancelMy", { businessId: biz.id, bookingId: maxBooked.id }, TG)).resolves.toBeTruthy();

    // следующая запись в Telegram → «Вы записаны» приходит и в Telegram, и в MAX (с пометкой, откуда)
    sent = [];
    await bookAs(TG, PHONE, 2);
    const confirm = (id: number) => sent.find((m) => m.chatId === id && m.html.includes("Вы записаны"));
    expect(confirm(TG)).toBeTruthy();
    expect(confirm(MAX)?.html).toContain("Запись сделана через Telegram");
    expect(noticeTo(MAX), "уже связанных повторно не оповещаем").toBeUndefined();
  });

  it("номер, вписанный руками (не подтверждён мессенджером), аккаунты не связывает — чужие записи не увидеть", async () => {
    await bookAs(TG, PHONE, 0); // настоящий владелец, номер подтверждён
    sent = [];
    await bookAs(-888, PHONE, 1, false); // кто-то в MAX вписал тот же номер руками
    expect(noticeTo(TG)).toBeUndefined();
    expect(await myCount(-888)).toBe(1);
    expect(await myCount(TG)).toBe(1);
  });

  it("у мастера в «Клиентах» один номер — одна строка: имена и записи вместе", () => {
    const g = groupClients([
      { tg_id: 1, name: "Антон", phone: "+7 (987) 953-87-47", person: 1, visits: 1, last_seen: "2", blocked_bot: false },
      { tg_id: 2, name: "тони", phone: "+7 (987) 953-87-47", person: 2, visits: 2, last_seen: "1", blocked_bot: false },
      { tg_id: -3, name: "Антон", phone: "", person: 1, visits: 0, last_seen: "0", blocked_bot: false },
      { tg_id: 4, name: "Daria", phone: "", person: 4, visits: 0, last_seen: "0", blocked_bot: false },
    ]);
    expect(g).toHaveLength(2);
    expect(g[0]).toMatchObject({ name: "Антон · тони", visits: 3, tg_ids: [1, 2, -3] });
  });

  it("«Это не я» разрывает связь: чужие записи больше не видны, и эти аккаунты больше не связываются", async () => {
    const tgBooked = await bookAs(TG, PHONE, 0);
    sent = [];
    const IMPOSTOR = -777;
    await bookAs(IMPOSTOR, PHONE, 1);
    expect(await myCount(IMPOSTOR)).toBe(2); // связалось по номеру…

    const reply = await onLinkAnswer(TG, requestIdOf(noticeTo(TG)!), false);
    expect(reply.html).toContain("Связь отменена");
    expect(await myCount(IMPOSTOR)).toBe(1); // …и разорвано
    expect(await myCount(TG)).toBe(1);
    await expect(call("cancelMy", { businessId: biz.id, bookingId: tgBooked.id }, IMPOSTOR)).rejects.toThrow("Это не ваша запись");

    sent = [];
    await bookAs(IMPOSTOR, PHONE, 2);
    expect(noticeTo(TG), "после «Это не я» больше не связываем").toBeUndefined();
    expect(await myCount(TG)).toBe(1);
  });

  it("нажать «Это не я» может только тот, кому пришло оповещение", async () => {
    await bookAs(TG, PHONE, 0);
    sent = [];
    await bookAs(MAX, PHONE, 1);
    const reply = await onLinkAnswer(MAX, requestIdOf(noticeTo(TG)!), false);
    expect(reply.html).toBe("Эта кнопка не для вас.");
    expect(await myCount(MAX)).toBe(2);
  });

  it("в одном мессенджере одинаковый номер у двух аккаунтов не связывается", async () => {
    await bookAs(TG, PHONE, 0);
    sent = [];
    await bookAs(301, PHONE, 1);
    expect(noticeTo(TG)).toBeUndefined();
    expect(await myCount(301)).toBe(1);
  });

  it("MAX не подключён — запись клиента из Telegram не падает, в MAX ничего не отправляется", async () => {
    await bookAs(MAX, PHONE, 0); // аккаунт MAX уже есть в базе
    const token = process.env.MAX_BOT_TOKEN;
    delete process.env.MAX_BOT_TOKEN;
    try {
      sent = [];
      await expect(bookAs(TG, PHONE, 1)).resolves.toHaveProperty("id");
      expect(sent.some((m) => m.chatId < 0)).toBe(false);
    } finally {
      process.env.MAX_BOT_TOKEN = token;
    }
  });
});

describe("поделиться номером — связка сразу при первом открытии бота", () => {
  const maxCalls: any[] = [];
  beforeEach(() => {
    maxCalls.length = 0;
    setMaxApi({ call: async (method, path, query, body) => (maxCalls.push({ method, path, query, body }), {} as any) });
  });

  it("новый человек открыл ссылку мастера — после карточки бот предлагает поделиться номером; если номер известен — нет", async () => {
    await upsertUser(db(), { id: 400, first_name: "Оля" });
    const replies = await onStart({ id: 400, first_name: "Оля" }, biz.slug, "tg");
    expect(replies[0].html).toContain("Ногти Анны");
    expect(replies[1]).toMatchObject({ askContact: true });
    expect(replies[1].html).toContain("если вы уже записывались через MAX");

    await bookAs(400, PHONE, 0); // номер стал известен из записи
    const again = await onStart({ id: 400, first_name: "Оля" }, biz.slug, "tg");
    expect(again.some((r) => r.askContact)).toBe(false);
  });

  it("MAX: бот при старте показывает кнопку «Поделиться номером» (request_contact)", async () => {
    await handleMaxUpdate({ update_type: "bot_started", user: { user_id: 901, first_name: "Оля" }, payload: biz.slug });
    const ask = maxCalls.filter((c) => c.path === "/messages")[1];
    expect(ask.body.text).toContain("если вы уже записывались через Telegram");
    expect(ask.body.attachments[0].payload.buttons[0][0]).toEqual({ type: "request_contact", text: "Поделиться номером" });
  });

  it("записалась в Telegram, потом в MAX поделилась номером → связка, в MAX — её записи, в Telegram — оповещение", async () => {
    await bookAs(TG, PHONE, 0);
    sent = [];
    await handleMaxUpdate({ update_type: "bot_started", user: { user_id: 555, first_name: "Аня" }, payload: biz.slug });
    await handleMaxUpdate({
      update_type: "message_created",
      message: {
        sender: { user_id: 555, first_name: "Аня" },
        recipient: { chat_type: "dialog", chat_id: 7 },
        body: { attachments: [{ type: "contact", payload: { vcf_info: "BEGIN:VCARD\nTEL;TYPE=cell:79271234567\nEND:VCARD", max_info: { user_id: 555 } } }] },
      },
    });
    const last = maxCalls.filter((c) => c.path === "/messages").pop();
    expect(last.body.text).toContain("Нашли ваш аккаунт в другом мессенджере");
    expect(last.body.text).toContain("Маникюр");
    expect(noticeTo(TG)?.html).toContain("Запись из MAX");
    expect(await myCount(MAX)).toBe(1);
  });

  it("чужой контакт (переслан чужой номер) не принимается", async () => {
    await bookAs(TG, PHONE, 0);
    await handleMaxUpdate({
      update_type: "message_created",
      message: {
        sender: { user_id: 556, first_name: "Чужой" },
        recipient: { chat_type: "dialog", chat_id: 8 },
        body: { attachments: [{ type: "contact", payload: { vcf_info: "TEL:79271234567", max_info: { user_id: 555 } } }] },
      },
    });
    expect(await myCount(-556)).toBe(0);
  });

  it("«Вы записаны» в Telegram — со ссылкой «Получать напоминания и в MAX», пока в MAX аккаунта нет", async () => {
    sent = [];
    await bookAs(TG, PHONE, 0);
    const confirm = sent.find((m) => m.chatId === TG && m.html.includes("Вы записаны"))!;
    expect(confirm.html).toContain(`https://max.ru/compot_max_bot?start=${biz.slug}`);

    await upsertUser(db(), { id: MAX, first_name: "Аня" }); // открыла бота в MAX…
    await onContact(MAX, "79271234567"); // …и поделилась номером — связаны
    sent = [];
    await bookAs(TG, PHONE, 1);
    expect(sent.find((m) => m.chatId === TG && m.html.includes("Вы записаны"))!.html).not.toContain("max.ru");
  });
});
