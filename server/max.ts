// Мессенджер MAX: клиент Bot API (platform-api2.max.ru) и перевод «телеграмных» кнопок в кнопки MAX.
//
// Пользователи MAX живут в тех же таблицах, что и пользователи Telegram, но с ОТРИЦАТЕЛЬНЫМ id:
// внутренний id = −(user_id в MAX). Так не нужно менять схему, а по знаку id понятно, куда слать сообщение.
import { request } from "node:https";
import { rootCertificates } from "node:tls";
import { config, decodeMaxStart, encodeMaxStart } from "./config.js";
import { RUSSIAN_TRUSTED_ROOT_CA } from "./max-ca.js";

export const isMaxUser = (id: number) => id < 0;
export const toMaxUserId = (internalId: number) => -internalId;
export const fromMaxUserId = (maxUserId: number) => -Math.abs(maxUserId);

const HOST = "platform-api2.max.ru";
const CA = [...rootCertificates, RUSSIAN_TRUSTED_ROOT_CA];

export class MaxApiError extends Error {
  constructor(
    public error_code: number,
    public description: string,
  ) {
    super(`MAX ${error_code}: ${description}`);
  }
}

export interface MaxApi {
  call<T = any>(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", path: string, query?: Record<string, string | number>, body?: unknown): Promise<T>;
}

/** Настоящий клиент: токен в заголовке Authorization, сертификат Минцифры добавлен к стандартным. */
function realApi(token: string): MaxApi {
  return {
    call: (method, path, query, body) =>
      new Promise((resolve, reject) => {
        const qs = query ? `?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}` : "";
        const data = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
        const req = request(
          {
            host: HOST,
            path: `${path}${qs}`,
            method,
            ca: CA,
            timeout: 15_000,
            headers: { authorization: token, ...(data ? { "content-type": "application/json", "content-length": data.length } : {}) },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => {
              const text = Buffer.concat(chunks).toString("utf8");
              let json: any = null;
              try {
                json = text ? JSON.parse(text) : {};
              } catch {}
              if ((res.statusCode ?? 500) >= 400) reject(new MaxApiError(res.statusCode ?? 500, json?.message ?? json?.code ?? text.slice(0, 200)));
              else resolve(json);
            });
          },
        );
        req.on("timeout", () => req.destroy(new Error("MAX timeout")));
        req.on("error", reject);
        if (data) req.write(data);
        req.end();
      }),
  };
}

let override: MaxApi | null = null;
let cached: { token: string; api: MaxApi } | null = null;

/** Для тестов: подменить API MAX. */
export function setMaxApi(api: MaxApi | null) {
  override = api;
}

export function maxApi(): MaxApi {
  if (override) return override;
  const token = config.maxBotToken;
  if (!token) throw new Error("MAX_BOT_TOKEN не задан");
  if (cached?.token !== token) cached = { token, api: realApi(token) };
  return cached.api;
}

// ---------- кнопки ----------

/** Кнопка в нейтральном виде — из неё строятся и кнопки Telegram, и кнопки MAX. */
export type Btn = { text: string; app?: { b?: string; view?: string }; url?: string; cb?: string };

type MaxButton =
  | { type: "open_app"; text: string; web_app: string; payload?: string }
  | { type: "link"; text: string; url: string }
  | { type: "callback"; text: string; payload: string };

export function maxKeyboard(rows: Btn[][]): unknown[] {
  const buttons: MaxButton[][] = rows
    .map((row) =>
      row.map((b): MaxButton => {
        if (b.app) {
          const payload = encodeMaxStart(b.app);
          return { type: "open_app", text: b.text.slice(0, 128), web_app: config.maxBotName, ...(payload ? { payload } : {}) };
        }
        if (b.url) return { type: "link", text: b.text.slice(0, 128), url: b.url };
        return { type: "callback", text: b.text.slice(0, 128), payload: b.cb ?? "" };
      }),
    )
    .filter((r) => r.length);
  return buttons.length ? [{ type: "inline_keyboard", payload: { buttons } }] : [];
}

/**
 * Перевод клавиатуры в формате Telegram (reply_markup.inline_keyboard) в нейтральные кнопки:
 * web_app с адресом нашего мини-аппа → открыть мини-апп MAX с тем же бизнесом и экраном.
 */
export function btnsFromTelegram(extra?: Record<string, any>): Btn[][] {
  const kb = extra?.reply_markup?.inline_keyboard as any[][] | undefined;
  if (!kb) return [];
  return kb.map((row) =>
    row.map((b): Btn => {
      if (b.web_app?.url) {
        const q = new URL(b.web_app.url).searchParams;
        return { text: b.text, app: { b: q.get("b") ?? undefined, view: q.get("view") ?? undefined } };
      }
      if (b.url) return { text: b.text, url: b.url };
      return { text: b.text, cb: b.callback_data ?? "" };
    }),
  );
}

/** Отправить сообщение пользователю MAX (id — внутренний, отрицательный). Текст — тот же HTML, что и для Telegram. */
export async function maxSend(internalId: number, html: string, rows: Btn[][] = []) {
  const attachments = maxKeyboard(rows);
  return maxApi().call("POST", "/messages", { user_id: toMaxUserId(internalId), disable_link_preview: "true" }, {
    text: html.slice(0, 4000),
    format: "html",
    ...(attachments.length ? { attachments } : {}),
  });
}

export const maxAnswerCallback = (callbackId: string, notification = "Открываю…") =>
  maxApi().call("POST", "/answers", { callback_id: callbackId }, { notification }).catch(() => {});

// ---------- самонастройка ----------

export const MAX_UPDATES = ["bot_started", "message_created", "message_callback"];

/** Подписать вебхук на наш адрес, задать команды и узнать ник бота. Возвращает состояние для /api/health. */
export async function setupMax(webhookUrl: string): Promise<{ bot: string; webhook: string | null }> {
  const api = maxApi();
  const me = await api.call<{ username?: string; name?: string }>("GET", "/me");
  if (me?.username) (await import("./config.js")).runtime.maxBotName = me.username;
  const subs = await api.call<{ subscriptions?: { url: string }[] }>("GET", "/subscriptions");
  const have = (subs?.subscriptions ?? []).map((s) => s.url);
  if (!have.includes(webhookUrl)) {
    for (const url of have) await api.call("DELETE", "/subscriptions", { url }).catch(() => {});
    await api.call("POST", "/subscriptions", undefined, { url: webhookUrl, update_types: MAX_UPDATES, secret: config.maxWebhookSecret });
    await api
      .call("PATCH", "/me/commands", undefined, {
        commands: [
          { name: "start", description: "Главное меню" },
          { name: "masters", description: "Мои мастера" },
          { name: "admin", description: "Панель для владельцев бизнеса" },
          { name: "id", description: "Мой id в MAX" },
        ],
      })
      .catch((e) => console.error("max commands", e));
  }
  return { bot: me?.username ?? "", webhook: webhookUrl };
}

export { decodeMaxStart };
