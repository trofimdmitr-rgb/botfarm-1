import { webhookCallback } from "grammy";
import { AuthError, verifyInitData } from "./auth.js";
import { getBot } from "./bot.js";
import { config, runtime, webAppUrl } from "./config.js";
import { db } from "./db.js";
import { runReminders } from "./cron.js";
import { dispatch } from "./rpc.js";
import { UserError } from "./store.js";
import { rawApi } from "./telegram.js";
import { timingSafeEqual } from "node:crypto";
import { decodeMaxStart, fromMaxUserId } from "./max.js";

const maxHelpers = { decodeMaxStart, fromMaxUserId };

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });

let webhook: ((req: Request) => Promise<Response>) | null = null;

function cronAuthorized(req: Request, url: URL): boolean {
  // Vercel Cron без CRON_SECRET в окружении шлёт запрос без авторизации; напоминания идемпотентны, лишний вызов безвреден
  if ((req.headers.get("user-agent") ?? "").startsWith("vercel-cron/")) return true;
  const secret = config.cronSecret;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}` || url.searchParams.get("key") === secret;
}

let platformLoadedAt = 0;
let webhookEnsured = false;
let maxEnsured = false;
const maxState: { bot: string | null; webhook: string | null; error: string | null } = { bot: null, webhook: null, error: null };
const maxWebhookUrl = () => `${config.publicUrl}/api/max`;

/** Раз в минуту: суперадмины из базы и юзернейм бота; на продакшене — самонастройка вебхука. */
async function refreshPlatform(force = false) {
  if (!force && Date.now() - platformLoadedAt < 60_000) return;
  platformLoadedAt = Date.now();
  try {
    const rows = await db().query<{ tg_id: number }>(`select tg_id from platform_admins`);
    runtime.dbSuperadmins = rows.map((r) => Number(r.tg_id));
  } catch (e) {
    console.error("platform_admins", e);
  }
  if (!config.botToken) return;
  try {
    if (!runtime.botUsername) runtime.botUsername = (await rawApi().getMe()).username;
    if (config.isProduction && !webhookEnsured) {
      const info = await rawApi().getWebhookInfo();
      if (info.url !== webhookUrl()) await setupBot();
      webhookEnsured = true;
    }
  } catch (e) {
    console.error("bot setup", e);
  }
  // MAX: включается сам, как только в окружении появляется MAX_BOT_TOKEN
  if (config.maxBotToken && config.isProduction && !maxEnsured) {
    try {
      const { setupMax } = await import("./max.js");
      Object.assign(maxState, await setupMax(maxWebhookUrl()), { error: null });
      maxEnsured = true;
    } catch (e: any) {
      maxState.error = String(e?.message ?? e).slice(0, 200);
      console.error("max setup", e);
    }
  }
}

function verifyMaxInit(raw: string) {
  if (!config.maxBotToken) throw new AuthError("MAX не подключён");
  const init = verifyInitData(raw, config.maxBotToken);
  const { decodeMaxStart, fromMaxUserId } = maxHelpers;
  return { ...init, user: { ...init.user, id: fromMaxUserId(init.user.id) }, startParam: decodeMaxStart(init.startParam).b };
}

async function maxWebhook(req: Request): Promise<Response> {
  const got = Buffer.from(req.headers.get("x-max-bot-api-secret") ?? "");
  const want = Buffer.from(config.maxWebhookSecret);
  if (!config.maxBotToken || got.length !== want.length || !timingSafeEqual(got, want)) return new Response("forbidden", { status: 403 });
  const update = await req.json().catch(() => null);
  try {
    const { handleMaxUpdate } = await import("./maxbot.js");
    await handleMaxUpdate(update);
  } catch (e) {
    // отвечаем 200 всегда: иначе MAX будет повторять доставку и через 8 часов отключит вебхук
    console.error("max update", e);
  }
  return json({ ok: true });
}

async function rpc(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    // мини-апп открыт в MAX — подпись проверяется токеном бота MAX, id пользователя становится отрицательным
    const maxRaw = req.headers.get("x-max-init-data");
    const init = maxRaw ? verifyMaxInit(maxRaw) : verifyInitData(req.headers.get("x-init-data") ?? "", config.botToken);
    const body = (await req.json()) as { method?: string; params?: Record<string, unknown> };
    const result = await dispatch(String(body.method ?? ""), body.params ?? {}, { init });
    return json({ result });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, 401);
    if (e instanceof UserError) return json({ error: e.message }, 400);
    console.error("rpc error", e);
    return json({ error: "Что-то пошло не так. Попробуйте ещё раз." }, 500);
  }
}

/** Фото портфолио: файл хранится в Telegram, отдаём через CDN Vercel с долгим кэшем. */
async function photo(url: URL): Promise<Response> {
  const q = url.searchParams;
  const kind = q.has("banner") ? "banner" : q.has("logo") ? "logo" : q.has("staff") ? "staff" : "id";
  const id = Number(q.get(kind));
  if (!Number.isInteger(id)) return new Response("bad id", { status: 400 });
  const sql = {
    banner: `select settings->>'bannerFileId' as file_id from businesses where id = $1`,
    logo: `select settings->>'logoFileId' as file_id from businesses where id = $1`,
    staff: `select photo_file_id as file_id from staff where id = $1`,
    id: `select file_id from portfolio where id = $1`,
  }[kind];
  const [row] = await db().query(sql, [id]);
  if (!row?.file_id) return new Response("not found", { status: 404 });
  const file = await rawApi().getFile(row.file_id);
  const res = await fetch(`https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`);
  if (!res.ok) return new Response("upstream error", { status: 502 });
  return new Response(res.body, {
    headers: {
      // логотип хранится файлом (PNG с прозрачностью) — Telegram отдаёт его без типа картинки
      "content-type": /\.png$/i.test(file.file_path ?? "") ? "image/png" : /\.webp$/i.test(file.file_path ?? "") ? "image/webp" : "image/jpeg",
      "cache-control": "public, max-age=86400, s-maxage=31536000, immutable",
    },
  });
}

/** В адресе вебхука — метка секрета: после перевыпуска токена адрес не совпадёт, и бот перенастроится сам. */
// SETUP_V — поднять, когда меняются команды/настройки бота: адрес вебхука изменится, и бот перенастроится сам
const SETUP_V = "2";
const webhookUrl = () => `${config.publicUrl}/api/bot?v=${config.webhookSecret.slice(0, 8)}${SETUP_V}`;

/** Настройка бота: вебхук, команды, кнопка меню, описание. */
async function setupBot() {
  const api = rawApi();
  await api.setWebhook(webhookUrl(), {
    secret_token: config.webhookSecret || undefined,
    allowed_updates: ["message", "callback_query", "my_chat_member"],
  });
  await api.setMyCommands([
    { command: "start", description: "Главное меню" },
    { command: "masters", description: "Мои мастера" },
    { command: "admin", description: "Панель для владельцев бизнеса" },
    { command: "help", description: "Помощь" },
  ]);
  await api.setChatMenuButton({ menu_button: { type: "web_app", text: "Открыть", web_app: { url: webAppUrl() } } });
  await api.setMyShortDescription("Онлайн-запись к мастерам и в салоны прямо в Telegram");
  await api.setMyDescription(
    "Записывайтесь к мастеру в пару касаний: выбор услуги, удобное время, напоминания. Предпринимателям — бесплатная онлайн-запись для бизнеса.",
  );
}

async function status(): Promise<Response> {
  try {
    await db().query("select 1");
  } catch (e: any) {
    return json({ ok: false, db: false, error: String(e?.message ?? e).replace(/postgres(ql)?:\/\/[^\s]+/g, "<url>") }, 500);
  }
  const info = config.botToken ? await rawApi().getWebhookInfo().catch(() => null) : null;
  // схема догнана доработками (db/003_links.sql)? — пробуем прочитать новые поля
  const schemaError = await db()
    .query(`select phone, person_id from users limit 1`)
    .then(() => db().query(`select id from link_requests limit 1`))
    .then(() => null)
    .catch((e: any) => String(e?.message ?? e).slice(0, 160));
  return json({
    ok: true,
    db: true,
    bot: config.botUsername || null,
    webhook: info?.url ?? null,
    pending: info?.pending_update_count ?? null,
    lastError: info?.last_error_message ?? null,
    superadmins: config.superadmins.length,
    schema: schemaError ? `ошибка: ${schemaError}` : "ok",
    publicUrl: config.publicUrl,
    production: config.isProduction,
    max: config.maxBotToken ? { ...maxState, bot: config.maxBotName || maxState.bot } : "не подключён (нет MAX_BOT_TOKEN)",
  });
}

export async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  runtime.requestHost = req.headers.get("x-forwarded-host") ?? url.host;
  const route = url.searchParams.get("route") || url.pathname.replace(/^\/api\/?/, "");
  if (route !== "photo" && route !== "log" && (process.env.DATABASE_URL || process.env.POSTGRES_URL)) await refreshPlatform(route === "health");

  switch (route) {
    case "rpc":
      return rpc(req);
    case "bot": {
      if (config.webhookSecret && req.headers.get("x-telegram-bot-api-secret-token") !== config.webhookSecret) {
        return new Response("forbidden", { status: 403 });
      }
      webhook ??= webhookCallback(getBot(), "std/http", { timeoutMilliseconds: 25_000 });
      return webhook(req);
    }
    case "max":
      return maxWebhook(req);
    case "log": {
      // ошибки загрузки мини-аппа (белый экран и т.п.) — в логи Vercel; без персональных данных
      const body = await req.text().catch(() => "");
      console.error("client error", body.slice(0, 1500));
      return new Response(null, { status: 204 });
    }
    case "photo":
      return photo(url);
    case "cron":
      if (!cronAuthorized(req, url)) return new Response("forbidden", { status: 403 });
      return json(await runReminders());
    case "setup":
      if (!cronAuthorized(req, url)) return new Response("forbidden", { status: 403 });
      await setupBot();
      return status();
    case "health":
      return status();
    default:
      return json({ error: "not found" }, 404);
  }
}
