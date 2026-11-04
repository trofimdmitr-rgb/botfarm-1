// MAX: вход в мини-апп по подписи MAX, вебхук с секретом, ответы бота кнопками MAX, отправка уведомлений в MAX.
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb } from "../server/pglite";
import { db, setDb } from "../server/db";
import { setSender, tg } from "../server/telegram";
import { btnsFromTelegram, maxKeyboard, setMaxApi } from "../server/max";
import { createBusinessFromTemplate } from "../server/store";

process.env.BOT_TOKEN = "123:TEST";
process.env.BOT_USERNAME = "farm_test_bot";
process.env.SUPERADMIN_IDS = "1";
process.env.PUBLIC_URL = "https://farm.example";
process.env.MAX_BOT_TOKEN = "max-test-token";
process.env.MAX_BOT_USERNAME = "compot_max_bot";

const calls: { method: string; path: string; query?: any; body?: any }[] = [];

beforeEach(async () => {
  setDb(await createPgliteDb());
  calls.length = 0;
  setMaxApi({ call: async (method, path, query, body) => (calls.push({ method, path, query, body }), {} as any) });
  setSender(null);
});

/** initData так, как его подписывает MAX (тот же алгоритм, что у Telegram, но ключ — токен бота MAX). */
function maxInit(userId: number, startParam = "") {
  const fields: Record<string, string> = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "q1",
    user: JSON.stringify({ id: userId, first_name: "Ира", last_name: "", username: "ira" }),
  };
  if (startParam) fields.start_param = startParam;
  const check = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(process.env.MAX_BOT_TOKEN!).digest();
  return new URLSearchParams({ ...fields, hash: createHmac("sha256", secret).update(check).digest("hex") }).toString();
}

async function handle(req: Request) {
  const { handle } = await import("../server/handler");
  return handle(req);
}

describe("MAX", () => {
  it("мини-апп в MAX: подпись MAX принимается, пользователь получает отрицательный id, start_param «slug__view» открывает бизнес", async () => {
    const b = await createBusinessFromTemplate(db(), { templateId: "beauty", name: "Ногти Иры" });
    const res = await handle(
      new Request("https://farm.example/api/rpc", {
        method: "POST",
        headers: { "content-type": "application/json", "x-max-init-data": maxInit(777, `${b.slug}__my`) },
        body: JSON.stringify({ method: "boot", params: {} }),
      }),
    );
    expect(res.status).toBe(200);
    const { result } = (await res.json()) as any;
    expect(result.me.id).toBe(-777);
    expect(result.business.slug).toBe(b.slug);
    // клиент MAX записан в клиенты бизнеса под отрицательным id
    const [c] = await db().query(`select tg_id from clients where business_id = $1`, [b.id]);
    expect(Number(c.tg_id)).toBe(-777);
  });

  it("подпись Telegram под видом MAX не проходит", async () => {
    const res = await handle(
      new Request("https://farm.example/api/rpc", {
        method: "POST",
        headers: { "content-type": "application/json", "x-max-init-data": maxInit(777).replace(/hash=[0-9a-f]+/, "hash=00") },
        body: JSON.stringify({ method: "boot", params: {} }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("вебхук без правильного секрета — 403, с секретом — бот отвечает карточкой бизнеса с кнопками мини-аппа MAX", async () => {
    const b = await createBusinessFromTemplate(db(), { templateId: "barber", name: "Борода" });
    const update = { update_type: "bot_started", chat_id: 5, user: { user_id: 555, first_name: "Олег" }, payload: b.slug };
    const bad = await handle(new Request("https://farm.example/api/max", { method: "POST", headers: { "x-max-bot-api-secret": "nope" }, body: JSON.stringify(update) }));
    expect(bad.status).toBe(403);
    expect(calls).toHaveLength(0);

    const { config } = await import("../server/config");
    const ok = await handle(
      new Request("https://farm.example/api/max", { method: "POST", headers: { "x-max-bot-api-secret": config.maxWebhookSecret }, body: JSON.stringify(update) }),
    );
    expect(ok.status).toBe(200);
    const send = calls.find((c) => c.method === "POST" && c.path === "/messages")!;
    expect(send.query.user_id).toBe(555);
    expect(send.body.format).toBe("html");
    expect(send.body.text).toContain("Борода");
    const buttons = send.body.attachments[0].payload.buttons.flat();
    expect(buttons[0]).toMatchObject({ type: "open_app", web_app: "compot_max_bot", payload: b.slug });
    expect(buttons[1]).toMatchObject({ type: "open_app", payload: `${b.slug}__my` });
  });

  it("уведомление клиенту из MAX уходит в MAX, а кнопка Telegram превращается в кнопку мини-аппа MAX", async () => {
    await tg().sendMessage(-555, "<b>Вы записаны</b>", {
      reply_markup: { inline_keyboard: [[{ text: "Мои записи", web_app: { url: "https://farm.example/?b=nogti-iry&view=my" } }]] },
    });
    const send = calls.find((c) => c.path === "/messages")!;
    expect(send.query.user_id).toBe(555);
    expect(send.body.attachments[0].payload.buttons[0][0]).toMatchObject({ type: "open_app", payload: "nogti-iry__my" });
  });

  it("перевод кнопок: ссылка и callback сохраняются", () => {
    const rows = btnsFromTelegram({ reply_markup: { inline_keyboard: [[{ text: "Сайт", url: "https://x.ru" }], [{ text: "Мастера", callback_data: "masters" }]] } });
    const kb: any = maxKeyboard(rows);
    expect(kb[0].payload.buttons).toEqual([[{ type: "link", text: "Сайт", url: "https://x.ru" }], [{ type: "callback", text: "Мастера", payload: "masters" }]]);
  });

  it("/id в MAX — человек узнаёт свой id (чтобы добавить его в суперадмины)", async () => {
    const { handleMaxUpdate } = await import("../server/maxbot");
    await handleMaxUpdate({
      update_type: "message_created",
      message: { sender: { user_id: 4242, first_name: "Антон" }, recipient: { chat_type: "dialog", chat_id: 1 }, body: { text: "/id" } },
    });
    expect(calls.find((c) => c.path === "/messages")!.body.text).toContain("4242");
  });
});
