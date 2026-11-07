// Один человек в Telegram и MAX: связка по номеру сразу, во второй мессенджер — оповещение с кнопкой «Это не я».
import { beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb } from "../server/pglite";
import { db, setDb } from "../server/db";
import { setSender } from "../server/telegram";
import { dispatch } from "../server/rpc";
import { onLinkAnswer } from "../server/flows";
import { upsertUser } from "../server/store";
import type { InitData } from "../server/auth";

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

async function bookAs(id: number, phone = PHONE, nth = 0) {
  await upsertUser(db(), { id, first_name: `U${id}` });
  const cat: any = await call("boot", { slug: biz.slug }, id);
  const service = cat.business.services[0];
  const av: any = await call("availability", { businessId: biz.id, serviceId: service.id }, id);
  // не сегодня: до записи должно быть больше часов, чем запрет на отмену
  const day = Object.keys(av).filter((d) => av[d].length > nth)[1];
  const slot = av[day][nth];
  return call("book", { businessId: biz.id, serviceId: service.id, start: slot.start, name: "Аня", phone }, id) as Promise<any>;
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

  it("запись в MAX с тем же номером → аккаунты связаны сразу, в Telegram оповещение; записи видны в обоих, уведомления — в оба", async () => {
    const tgBooked = await bookAs(TG, PHONE, 0);
    sent = [];
    await bookAs(MAX, "89271234567", 1); // тот же номер в другом виде

    const notice = noticeTo(TG)!;
    expect(notice, "в Telegram пришло оповещение").toBeTruthy();
    expect(notice.html).toContain("В MAX вы записались к «Ногти Анны»");
    expect(notice.extra.reply_markup.inline_keyboard[0][0].text).toBe("Это не я");

    // без подтверждения: обе записи сразу видны в обоих мессенджерах
    expect(await myCount(MAX)).toBe(2);
    expect(await myCount(TG)).toBe(2);
    // и отменить запись, сделанную в Telegram, можно из MAX
    await expect(call("cancelMy", { businessId: biz.id, bookingId: tgBooked.id }, MAX)).resolves.toBeTruthy();

    // следующая запись в Telegram → «Вы записаны» приходит и в Telegram, и в MAX (с пометкой, откуда)
    sent = [];
    await bookAs(TG, PHONE, 2);
    const confirm = (id: number) => sent.find((m) => m.chatId === id && m.html.includes("Вы записаны"));
    expect(confirm(TG)).toBeTruthy();
    expect(confirm(MAX)?.html).toContain("Запись сделана через Telegram");
    expect(noticeTo(MAX), "уже связанных повторно не оповещаем").toBeUndefined();
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
