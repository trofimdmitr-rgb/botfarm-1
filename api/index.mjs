var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/config.ts
var config_exports = {};
__export(config_exports, {
  adminLink: () => adminLink,
  clientLink: () => clientLink,
  config: () => config,
  decodeMaxStart: () => decodeMaxStart,
  encodeMaxStart: () => encodeMaxStart,
  inviteLink: () => inviteLink,
  isProductionHost: () => isProductionHost,
  maxAdminLink: () => maxAdminLink,
  maxClientLink: () => maxClientLink,
  maxInviteLink: () => maxInviteLink,
  runtime: () => runtime,
  webAppUrl: () => webAppUrl
});
import { createHmac as createHmac2 } from "node:crypto";
function isProductionHost(host) {
  if (!/^[a-z0-9-]+\.vercel\.app$/.test(host)) return false;
  const name = host.replace(/\.vercel\.app$/, "");
  if (name.includes("-git-")) return false;
  return !/-[a-z0-9]{9}-/.test(`${name}-`);
}
function clientLink(slug) {
  return config.botAppName ? `https://t.me/${config.botUsername}/${config.botAppName}?startapp=${slug}` : `https://t.me/${config.botUsername}?start=${slug}`;
}
function webAppUrl(params = {}) {
  const q = new URLSearchParams();
  if (params.b) q.set("b", params.b);
  if (params.view) q.set("view", params.view);
  const s = q.toString();
  return `${config.publicUrl}/${s ? `?${s}` : ""}`;
}
function encodeMaxStart(p) {
  return [p.b ?? "", p.view ?? ""].join("__").replace(/__$/, "").replace(/[^\w-]/g, "");
}
function decodeMaxStart(s) {
  if (!s) return {};
  const [b, view] = s.split("__");
  return { b: b || void 0, view: view || void 0 };
}
var env, runtime, derived, config, inviteLink, adminLink, maxClientLink, maxAdminLink, maxInviteLink;
var init_config = __esm({
  "server/config.ts"() {
    "use strict";
    env = (k, d = "") => (process.env[k] ?? d).trim();
    runtime = { botUsername: "", maxBotName: "", dbSuperadmins: [], requestHost: "" };
    derived = (purpose) => config.botToken ? createHmac2("sha256", config.botToken).update(purpose).digest("base64url").slice(0, 40) : "";
    config = {
      get botToken() {
        return env("BOT_TOKEN");
      },
      get botUsername() {
        return (env("BOT_USERNAME") || runtime.botUsername).replace(/^@/, "");
      },
      /** Короткое имя Mini App из BotFather (/newapp). Необязательно. */
      get botAppName() {
        return env("BOT_APP_NAME");
      },
      get superadmins() {
        const fromEnv = env("SUPERADMIN_IDS").split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => Number.isFinite(n) && n !== 0);
        return [.../* @__PURE__ */ new Set([...fromEnv, ...runtime.dbSuperadmins])];
      },
      /** Адрес сайта: https://xxx.vercel.app */
      get publicUrl() {
        const explicit = env("PUBLIC_URL");
        if (explicit) return explicit.replace(/\/$/, "");
        const v = env("VERCEL_PROJECT_PRODUCTION_URL");
        if (v) return `https://${v}`;
        if (isProductionHost(runtime.requestHost)) return `https://${runtime.requestHost}`;
        return "http://localhost:5173";
      },
      /** Токен бота MAX (business.max.ru → чат-боты → интеграция). Без него MAX просто выключен. */
      get maxBotToken() {
        return env("MAX_BOT_TOKEN");
      },
      /** Ник бота MAX (из GET /me); можно задать явно. */
      get maxBotName() {
        return (env("MAX_BOT_USERNAME") || runtime.maxBotName).replace(/^@/, "");
      },
      /** Секрет вебхука MAX: 5–256 символов [A-Za-z0-9_-], производный от токена MAX. */
      get maxWebhookSecret() {
        const t = env("MAX_BOT_TOKEN");
        return t ? createHmac2("sha256", t).update("max-webhook").digest("base64url").slice(0, 48) : "";
      },
      /** Куда складывать фото, которые мастер из MAX загружает в портфолио (фото хранятся в Telegram). */
      get tgStorageChat() {
        const v = Number(env("TG_STORAGE_CHAT_ID"));
        return Number.isFinite(v) && v !== 0 ? v : config.superadmins.find((id) => id > 0) ?? 0;
      },
      get webhookSecret() {
        return env("WEBHOOK_SECRET") || derived("webhook");
      },
      get cronSecret() {
        return env("CRON_SECRET") || derived("cron");
      },
      get isProduction() {
        if (env("VERCEL_ENV")) return env("VERCEL_ENV") === "production";
        return isProductionHost(runtime.requestHost) && `https://${runtime.requestHost}` === config.publicUrl;
      }
    };
    inviteLink = (code) => `https://t.me/${config.botUsername}?start=inv_${code}`;
    adminLink = (slug) => `https://t.me/${config.botUsername}?start=adm_${slug}`;
    maxClientLink = (slug) => `https://max.ru/${config.maxBotName}?startapp=${encodeMaxStart({ b: slug })}`;
    maxAdminLink = (slug) => `https://max.ru/${config.maxBotName}?start=adm_${slug}`;
    maxInviteLink = (code) => `https://max.ru/${config.maxBotName}?start=inv_${code}`;
  }
});

// server/schema.gen.ts
var SCHEMA_SQL, MIGRATIONS_SQL;
var init_schema_gen = __esm({
  "server/schema.gen.ts"() {
    "use strict";
    SCHEMA_SQL = `-- BotFarm: \u0441\u0445\u0435\u043C\u0430. \u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u043E\u0434\u0438\u043D \u0440\u0430\u0437 \u0432 \u043D\u043E\u0432\u043E\u043C \u043F\u0440\u043E\u0435\u043A\u0442\u0435 Supabase.
create extension if not exists btree_gist;

create table if not exists users (
  tg_id            bigint primary key,
  first_name       text not null default '',
  username         text,
  last_business_id bigint,
  created_at       timestamptz not null default now(),
  seen_at          timestamptz not null default now()
);

create table if not exists businesses (
  id          bigint generated always as identity primary key,
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,40}$'),
  name        text not null,
  template    text not null,
  status      text not null default 'active' check (status in ('active','blocked')),
  timezone    text not null default 'Europe/Moscow',
  -- \u0442\u0435\u043A\u0441\u0442\u044B, \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B, \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u0437\u0430\u043F\u0438\u0441\u0438, \u043F\u043E\u043B\u044F \u0430\u043D\u043A\u0435\u0442\u044B, \u0442\u0435\u0440\u043C\u0438\u043D\u044B, \u0430\u043A\u0446\u0435\u043D\u0442\u043D\u044B\u0439 \u0446\u0432\u0435\u0442
  settings    jsonb not null default '{}'::jsonb,
  created_by  bigint,
  created_at  timestamptz not null default now()
);

create table if not exists business_admins (
  business_id bigint not null references businesses(id) on delete cascade,
  tg_id       bigint not null,
  role        text not null default 'admin' check (role in ('owner','admin')),
  created_at  timestamptz not null default now(),
  primary key (business_id, tg_id)
);
create index if not exists business_admins_tg on business_admins(tg_id);

create table if not exists invites (
  code        text primary key,
  business_id bigint not null references businesses(id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner','admin')),
  created_by  bigint,
  used_by     bigint,
  used_at     timestamptz,
  expires_at  timestamptz not null default now() + interval '30 days'
);

create table if not exists staff (
  id          bigint generated always as identity primary key,
  business_id bigint not null references businesses(id) on delete cascade,
  name        text not null,
  description text not null default '',
  tg_id       bigint,                      -- \u0435\u0441\u043B\u0438 \u043C\u0430\u0441\u0442\u0435\u0440 \u0445\u043E\u0447\u0435\u0442 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0441\u0432\u043E\u0438 \u0437\u0430\u043F\u0438\u0441\u0438
  work_hours  jsonb not null default '{}'::jsonb, -- {"1":[["10:00","19:00"]],...}
  active      boolean not null default true,
  sort        int not null default 0
);
create index if not exists staff_business on staff(business_id);

create table if not exists services (
  id           bigint generated always as identity primary key,
  business_id  bigint not null references businesses(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  price        int not null default 0 check (price >= 0),
  price_from   boolean not null default false,  -- \xAB\u043E\u0442 1500 \u20BD\xBB
  duration_min int not null default 60 check (duration_min between 5 and 720),
  active       boolean not null default true,
  sort         int not null default 0
);
create index if not exists services_business on services(business_id);

-- \u0437\u0430\u043A\u0440\u044B\u0442\u043E\u0435 \u0432\u0440\u0435\u043C\u044F: \u0432\u044B\u0445\u043E\u0434\u043D\u043E\u0439, \u043E\u0442\u043F\u0443\u0441\u043A, \u043F\u0435\u0440\u0435\u0440\u044B\u0432. staff_id null = \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432
create table if not exists time_off (
  id          bigint generated always as identity primary key,
  business_id bigint not null references businesses(id) on delete cascade,
  staff_id    bigint references staff(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null check (ends_at > starts_at),
  reason      text not null default ''
);
create index if not exists time_off_lookup on time_off(business_id, starts_at);

create table if not exists bookings (
  id            bigint generated always as identity primary key,
  business_id   bigint not null references businesses(id) on delete cascade,
  staff_id      bigint not null references staff(id) on delete cascade,
  service_id    bigint references services(id) on delete set null,
  service_title text not null,
  price         int not null default 0,
  client_tg_id  bigint not null,
  client_name   text not null,
  client_phone  text not null default '',
  answers       jsonb not null default '{}'::jsonb,
  comment       text not null default '',
  starts_at     timestamptz not null,
  ends_at       timestamptz not null check (ends_at > starts_at),
  status        text not null default 'confirmed'
                check (status in ('confirmed','cancelled','done','no_show')),
  cancelled_by  text check (cancelled_by in ('client','admin')),
  reminded_24h  boolean not null default false,
  reminded_2h   boolean not null default false,
  created_at    timestamptz not null default now(),
  -- \u0433\u043B\u0430\u0432\u043D\u043E\u0435: \u0443 \u043E\u0434\u043D\u043E\u0433\u043E \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u0434\u0432\u0443\u0445 \u043F\u0435\u0440\u0435\u0441\u0435\u043A\u0430\u044E\u0449\u0438\u0445\u0441\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439
  constraint bookings_no_overlap exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed')
);
create index if not exists bookings_business_time on bookings(business_id, starts_at);
create index if not exists bookings_client on bookings(client_tg_id, starts_at);
create index if not exists bookings_reminders on bookings(starts_at) where status = 'confirmed';

-- \u043A\u043B\u0438\u0435\u043D\u0442\u044B \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0433\u043E \u0431\u0438\u0437\u043D\u0435\u0441\u0430: \u0434\u043B\u044F \u0440\u0430\u0441\u0441\u044B\u043B\u043A\u0438 \u0438 \u043C\u0438\u043D\u0438-CRM
create table if not exists clients (
  business_id bigint not null references businesses(id) on delete cascade,
  tg_id       bigint not null,
  name        text not null default '',
  phone       text not null default '',
  note        text not null default '',
  blocked_bot boolean not null default false,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  primary key (business_id, tg_id)
);

create table if not exists portfolio (
  id          bigint generated always as identity primary key,
  business_id bigint not null references businesses(id) on delete cascade,
  file_id     text not null,
  caption     text not null default '',
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists portfolio_business on portfolio(business_id, sort);

-- \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u044B \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B (\u0441\u0443\u043F\u0435\u0440\u0430\u0434\u043C\u0438\u043D\u044B) \u0432 \u0434\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u043A SUPERADMIN_IDS
create table if not exists platform_admins (
  tg_id bigint primary key,
  note  text not null default ''
);

-- \u0414\u043E\u0441\u0442\u0443\u043F \u043A \u0442\u0430\u0431\u043B\u0438\u0446\u0430\u043C \u0442\u043E\u043B\u044C\u043A\u043E \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 (\u0440\u043E\u043B\u044C postgres). \u041F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 REST Supabase \u0437\u0430\u043A\u0440\u044B\u0442:
alter table users enable row level security;
alter table businesses enable row level security;
alter table business_admins enable row level security;
alter table invites enable row level security;
alter table staff enable row level security;
alter table services enable row level security;
alter table time_off enable row level security;
alter table bookings enable row level security;
alter table clients enable row level security;
alter table portfolio enable row level security;
alter table platform_admins enable row level security;

alter table users add column if not exists phone text;          -- \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043D\u043E\u043C\u0435\u0440, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0447\u0435\u043B\u043E\u0432\u0435\u043A \u0443\u043A\u0430\u0437\u0430\u043B
alter table users add column if not exists person_id bigint;    -- \u043E\u0431\u0449\u0438\u0439 id \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430: \u0443 \u0441\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0445 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u043E\u0432 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0439
create index if not exists users_phone on users(phone);
create index if not exists users_person on users(person_id);

-- \xAB\u042D\u0442\u043E \u0432\u044B?\xBB: \u0441\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u043C \u0412\u041B\u0410\u0414\u0415\u041B\u042C\u0426\u0410 \u0443\u0436\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 (to_id), \u043A\u043E\u0433\u0434\u0430 \u0434\u0440\u0443\u0433\u043E\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 (from_id) \u0443\u043A\u0430\u0437\u0430\u043B \u0442\u043E\u0442 \u0436\u0435 \u043D\u043E\u043C\u0435\u0440.
-- \u0421\u0432\u044F\u0437\u044B\u0432\u0430\u0435\u043C \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E \xAB\u0414\u0430\xBB \u2014 \u0438\u043D\u0430\u0447\u0435 \u043A\u0442\u043E \u0443\u0433\u043E\u0434\u043D\u043E \u0432\u0432\u0451\u043B \u0431\u044B \u0447\u0443\u0436\u043E\u0439 \u043D\u043E\u043C\u0435\u0440 \u0438 \u0443\u0432\u0438\u0434\u0435\u043B \u0447\u0443\u0436\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0438.
create table if not exists link_requests (
  id          bigserial primary key,
  from_id     bigint not null,
  to_id       bigint not null,
  phone       text not null,
  status      text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at  timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists link_requests_pair on link_requests(from_id, to_id);
-- 004: \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0439 \u043D\u043E\u043C\u0435\u0440, \u0430\u043B\u044C\u0431\u043E\u043C\u044B \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E (\u0430\u043B\u044C\u0431\u043E\u043C = \u0443\u0441\u043B\u0443\u0433\u0430), \u0444\u043E\u0442\u043E \u043F\u043E \u043C\u0430\u0441\u0442\u0435\u0440\u0430\u043C, \u0444\u043E\u0442\u043E \u043C\u0430\u0441\u0442\u0435\u0440\u0430.
-- \u0418\u0434\u0435\u043C\u043F\u043E\u0442\u0435\u043D\u0442\u043D\u043E: \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u043A\u0430\u0436\u0434\u043E\u043C \u0445\u043E\u043B\u043E\u0434\u043D\u043E\u043C \u0441\u0442\u0430\u0440\u0442\u0435 (MIGRATIONS_SQL).

-- \u043D\u043E\u043C\u0435\u0440 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u043E\u043C (\u043A\u043E\u043D\u0442\u0430\u043A\u0442 \u0438\u0437 \u0431\u043E\u0442\u0430 \u0438\u043B\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 requestContact) \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E \u043D\u0435\u043C\u0443
-- \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0435\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u044B \u0438 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u043C \u043E\u0431\u0449\u0438\u0435 \xAB\u041C\u043E\u0438 \u0437\u0430\u043F\u0438\u0441\u0438\xBB
alter table users add column if not exists phone_verified boolean not null default false;

-- \u0444\u043E\u0442\u043E \u043C\u0430\u0441\u0442\u0435\u0440\u0430 (file_id \u0432 Telegram, \u043A\u0430\u043A \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E)
alter table staff add column if not exists photo_file_id text not null default '';

-- \u0430\u043B\u044C\u0431\u043E\u043C\u044B \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E: \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0438 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E) \u0443\u0441\u043B\u0443\u0433\u0430, \u043A \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u044D\u0442\u043E \u043F\u0440\u0438\u043C\u0435\u0440\u044B \u0440\u0430\u0431\u043E\u0442
create table if not exists albums (
  id          bigint generated always as identity primary key,
  business_id bigint not null references businesses(id) on delete cascade,
  title       text not null,
  description text not null default '',
  service_id  bigint references services(id) on delete set null,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists albums_business on albums(business_id, sort);
alter table albums enable row level security;

-- \u0444\u043E\u0442\u043E \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E: \u0447\u044C\u0451 (\u043C\u0430\u0441\u0442\u0435\u0440) \u0438 \u0432 \u043A\u0430\u043A\u043E\u043C \u0430\u043B\u044C\u0431\u043E\u043C\u0435
alter table portfolio add column if not exists staff_id bigint references staff(id) on delete set null;
alter table portfolio add column if not exists album_id bigint references albums(id) on delete set null;
create index if not exists portfolio_album on portfolio(album_id);
`;
    MIGRATIONS_SQL = "-- \u0421\u0432\u044F\u0437\u043A\u0430 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u043E\u0432 \u043E\u0434\u043D\u043E\u0433\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430 \u0432 \u0440\u0430\u0437\u043D\u044B\u0445 \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u0430\u0445 (Telegram \u2194 MAX).\n-- \u0418\u0434\u0435\u043C\u043F\u043E\u0442\u0435\u043D\u0442\u043D\u043E: \u0441\u0435\u0440\u0432\u0435\u0440 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442 \u044D\u0442\u043E\u0442 \u0444\u0430\u0439\u043B \u043F\u0440\u0438 \u043A\u0430\u0436\u0434\u043E\u043C \u0445\u043E\u043B\u043E\u0434\u043D\u043E\u043C \u0441\u0442\u0430\u0440\u0442\u0435 (server/db.ts \u2192 MIGRATIONS_SQL).\nalter table users add column if not exists phone text;          -- \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043D\u043E\u043C\u0435\u0440, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0447\u0435\u043B\u043E\u0432\u0435\u043A \u0443\u043A\u0430\u0437\u0430\u043B\nalter table users add column if not exists person_id bigint;    -- \u043E\u0431\u0449\u0438\u0439 id \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430: \u0443 \u0441\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0445 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u043E\u0432 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0439\ncreate index if not exists users_phone on users(phone);\ncreate index if not exists users_person on users(person_id);\n\n-- \xAB\u042D\u0442\u043E \u0432\u044B?\xBB: \u0441\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u043C \u0412\u041B\u0410\u0414\u0415\u041B\u042C\u0426\u0410 \u0443\u0436\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 (to_id), \u043A\u043E\u0433\u0434\u0430 \u0434\u0440\u0443\u0433\u043E\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 (from_id) \u0443\u043A\u0430\u0437\u0430\u043B \u0442\u043E\u0442 \u0436\u0435 \u043D\u043E\u043C\u0435\u0440.\n-- \u0421\u0432\u044F\u0437\u044B\u0432\u0430\u0435\u043C \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E \xAB\u0414\u0430\xBB \u2014 \u0438\u043D\u0430\u0447\u0435 \u043A\u0442\u043E \u0443\u0433\u043E\u0434\u043D\u043E \u0432\u0432\u0451\u043B \u0431\u044B \u0447\u0443\u0436\u043E\u0439 \u043D\u043E\u043C\u0435\u0440 \u0438 \u0443\u0432\u0438\u0434\u0435\u043B \u0447\u0443\u0436\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0438.\ncreate table if not exists link_requests (\n  id          bigserial primary key,\n  from_id     bigint not null,\n  to_id       bigint not null,\n  phone       text not null,\n  status      text not null default 'pending' check (status in ('pending','accepted','declined')),\n  created_at  timestamptz not null default now(),\n  answered_at timestamptz\n);\ncreate index if not exists link_requests_pair on link_requests(from_id, to_id);\n\n-- \u043D\u043E\u043C\u0435\u0440\u0430 \u0438\u0437 \u0443\u0436\u0435 \u0441\u0434\u0435\u043B\u0430\u043D\u043D\u044B\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439: \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430\u043C, \u0443 \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u043D\u043E\u043C\u0435\u0440 \u0435\u0449\u0451 \u043D\u0435 \u0437\u0430\u043F\u043E\u043C\u043D\u0435\u043D\nupdate users u set phone = c.phone\nfrom (\n  select distinct on (tg_id) tg_id, phone from clients\n  where phone is not null and phone <> '' order by tg_id, last_seen desc\n) c\nwhere c.tg_id = u.tg_id and u.phone is null;\n\n-- 004: \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0439 \u043D\u043E\u043C\u0435\u0440, \u0430\u043B\u044C\u0431\u043E\u043C\u044B \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E (\u0430\u043B\u044C\u0431\u043E\u043C = \u0443\u0441\u043B\u0443\u0433\u0430), \u0444\u043E\u0442\u043E \u043F\u043E \u043C\u0430\u0441\u0442\u0435\u0440\u0430\u043C, \u0444\u043E\u0442\u043E \u043C\u0430\u0441\u0442\u0435\u0440\u0430.\n-- \u0418\u0434\u0435\u043C\u043F\u043E\u0442\u0435\u043D\u0442\u043D\u043E: \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u043A\u0430\u0436\u0434\u043E\u043C \u0445\u043E\u043B\u043E\u0434\u043D\u043E\u043C \u0441\u0442\u0430\u0440\u0442\u0435 (MIGRATIONS_SQL).\n\n-- \u043D\u043E\u043C\u0435\u0440 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u043E\u043C (\u043A\u043E\u043D\u0442\u0430\u043A\u0442 \u0438\u0437 \u0431\u043E\u0442\u0430 \u0438\u043B\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 requestContact) \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E \u043D\u0435\u043C\u0443\n-- \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u0435\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u044B \u0438 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u043C \u043E\u0431\u0449\u0438\u0435 \xAB\u041C\u043E\u0438 \u0437\u0430\u043F\u0438\u0441\u0438\xBB\nalter table users add column if not exists phone_verified boolean not null default false;\n\n-- \u0444\u043E\u0442\u043E \u043C\u0430\u0441\u0442\u0435\u0440\u0430 (file_id \u0432 Telegram, \u043A\u0430\u043A \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E)\nalter table staff add column if not exists photo_file_id text not null default '';\n\n-- \u0430\u043B\u044C\u0431\u043E\u043C\u044B \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E: \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0438 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E) \u0443\u0441\u043B\u0443\u0433\u0430, \u043A \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u044D\u0442\u043E \u043F\u0440\u0438\u043C\u0435\u0440\u044B \u0440\u0430\u0431\u043E\u0442\ncreate table if not exists albums (\n  id          bigint generated always as identity primary key,\n  business_id bigint not null references businesses(id) on delete cascade,\n  title       text not null,\n  description text not null default '',\n  service_id  bigint references services(id) on delete set null,\n  sort        int not null default 0,\n  created_at  timestamptz not null default now()\n);\ncreate index if not exists albums_business on albums(business_id, sort);\nalter table albums enable row level security;\n\n-- \u0444\u043E\u0442\u043E \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E: \u0447\u044C\u0451 (\u043C\u0430\u0441\u0442\u0435\u0440) \u0438 \u0432 \u043A\u0430\u043A\u043E\u043C \u0430\u043B\u044C\u0431\u043E\u043C\u0435\nalter table portfolio add column if not exists staff_id bigint references staff(id) on delete set null;\nalter table portfolio add column if not exists album_id bigint references albums(id) on delete set null;\ncreate index if not exists portfolio_album on portfolio(album_id);\n";
  }
});

// server/db.ts
import postgres from "postgres";
function resolveDatabaseUrl(env2 = process.env) {
  const raw = (env2.DATABASE_URL || env2.POSTGRES_URL || "").trim();
  if (!raw) return null;
  const u = new URL(raw);
  const sslmode = u.searchParams.get("sslmode");
  u.search = "";
  const ssl = sslmode === "require" || /supabase\.(co|com)$/.test(u.hostname);
  return { url: u.toString(), ssl };
}
function db() {
  if (current) return current;
  const resolved = resolveDatabaseUrl();
  if (!resolved) throw new Error("\u041D\u0435 \u0437\u0430\u0434\u0430\u043D \u0430\u0434\u0440\u0435\u0441 \u0431\u0430\u0437\u044B: DATABASE_URL \u0438\u043B\u0438 POSTGRES_URL");
  const sql = postgres(resolved.url, {
    prepare: false,
    ssl: resolved.ssl ? "require" : void 0,
    max: 3,
    // несколько соединений на тёплый экземпляр; остальное держит пулер Supabase
    idle_timeout: 20,
    connect_timeout: 10,
    types: {
      bigint: { to: 20, from: [20], serialize: (x) => String(x), parse: (x) => Number(x) }
    }
  });
  const ready = ensureSchema(sql).catch((e) => {
    console.error("ensureSchema", e);
  });
  current = wrapPostgres(sql, ready);
  return current;
}
async function ensureSchema(sql) {
  const [row2] = await sql.unsafe(`select to_regclass('businesses') is not null as ok`);
  if (row2?.ok) {
    try {
      await sql.unsafe(MIGRATIONS_SQL);
    } catch (e) {
      console.error("migrations", e);
    }
    return;
  }
  try {
    await sql.unsafe(`create extension if not exists btree_gist with schema extensions`);
  } catch {
  }
  await sql.unsafe(SCHEMA_SQL);
  for (const [id, note] of DEFAULT_SUPERADMINS) {
    await sql.unsafe(`insert into platform_admins (tg_id, note) values ($1, $2) on conflict do nothing`, [id, note]);
  }
  console.log("\u0421\u0445\u0435\u043C\u0430 \u0411\u0414 \u0441\u043E\u0437\u0434\u0430\u043D\u0430");
}
function wrapPostgres(sql, ready = Promise.resolve()) {
  return {
    query: async (text, params = []) => {
      await ready;
      return sql.unsafe(text, params);
    },
    tx: async (fn) => {
      await ready;
      return sql.begin((t) => fn(wrapPostgres(t)));
    }
  };
}
function isOverlapError(e) {
  const err = e;
  return err?.code === "23P01" || /bookings_no_overlap/.test(err?.message ?? "");
}
var current, DEFAULT_SUPERADMINS;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema_gen();
    current = null;
    DEFAULT_SUPERADMINS = [
      [8181483439, "\u0410\u043D\u0442\u043E\u043D"],
      [2015823821, "\u0414\u043C\u0438\u0442\u0440\u0438\u0439"]
    ];
  }
});

// server/format.ts
var format_exports = {};
__export(format_exports, {
  esc: () => esc,
  fmtTime: () => fmtTime,
  fmtWhen: () => fmtWhen,
  relDay: () => relDay,
  rub: () => rub
});
import { DateTime } from "luxon";
function fmtWhen(at, tz) {
  return DateTime.fromJSDate(new Date(at)).setZone(tz).setLocale("ru").toFormat("ccc, d MMMM, HH:mm");
}
function fmtTime(at, tz) {
  return DateTime.fromJSDate(new Date(at)).setZone(tz).toFormat("HH:mm");
}
function relDay(at, tz, now = /* @__PURE__ */ new Date()) {
  const d = DateTime.fromJSDate(new Date(at)).setZone(tz).startOf("day");
  const t = DateTime.fromJSDate(now).setZone(tz).startOf("day");
  const diff = Math.round(d.diff(t, "days").days);
  if (diff === 0) return "\u0441\u0435\u0433\u043E\u0434\u043D\u044F";
  if (diff === 1) return "\u0437\u0430\u0432\u0442\u0440\u0430";
  return d.setLocale("ru").toFormat("ccc, d MMMM");
}
var esc, rub;
var init_format = __esm({
  "server/format.ts"() {
    "use strict";
    esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    rub = (n, from = false) => n === 0 ? "\u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E" : `${from ? "\u043E\u0442\xA0" : ""}${n.toLocaleString("ru-RU")}\xA0\u20BD`;
  }
});

// server/phone.ts
function formatRu(d) {
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}
function looksFake(national) {
  const sub = national.slice(-7);
  if (/^(\d)\1+$/.test(sub)) return true;
  if (/^(\d)\1+$/.test(national)) return true;
  const seq = "01234567890123456789";
  const rev = "98765432109876543210";
  if (seq.includes(national) || rev.includes(national)) return true;
  return false;
}
function checkPhone(raw) {
  const s = String(raw ?? "").trim();
  let d = s.replace(/\D/g, "");
  if (!d) return { ok: false, error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0442\u0435\u043B\u0435\u0444\u043E\u043D" };
  const plus = s.startsWith("+");
  if (!plus && d.length === 11 && d[0] === "8") d = "7" + d.slice(1);
  if (!plus && d.length === 10 && d[0] === "9") d = "7" + d;
  if (d[0] === "7") {
    if (d.length !== 11) return { ok: false, error: PHONE_ERROR };
    const national = d.slice(1);
    if (!/^[34789]/.test(national)) return { ok: false, error: PHONE_ERROR };
    if (looksFake(national)) return { ok: false, error: PHONE_ERROR };
    return { ok: true, phone: formatRu(d) };
  }
  if (!plus || d.length < 8 || d.length > 15 || d[0] === "0" || looksFake(d.slice(-9))) {
    return { ok: false, error: PHONE_ERROR };
  }
  return { ok: true, phone: `+${d}` };
}
var PHONE_ERROR;
var init_phone = __esm({
  "server/phone.ts"() {
    "use strict";
    PHONE_ERROR = "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430 \u2014 \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, +7 999 123-45-67";
  }
});

// server/slots.ts
import { DateTime as DateTime2 } from "luxon";
function parseHM(day, hm) {
  const [h, m] = hm.split(":").map(Number);
  return day.set({ hour: h, minute: m, second: 0, millisecond: 0 });
}
function computeSlots(input) {
  const { tz, stepMin, durationMin } = input;
  const day = DateTime2.fromISO(input.date, { zone: tz }).startOf("day");
  if (!day.isValid || stepMin <= 0 || durationMin <= 0) return [];
  const today = DateTime2.fromJSDate(input.now, { zone: tz }).startOf("day");
  const daysAhead = Math.round(day.diff(today, "days").days);
  if (daysAhead < 0 || daysAhead > input.maxDaysAhead) return [];
  const intervals = input.workHours[String(day.weekday)] ?? [];
  const earliest = input.now.getTime() + input.minLeadMin * 6e4;
  const busy = input.busy.map((b) => [toMs(b.start), toMs(b.end)]);
  const durMs = durationMin * 6e4;
  const result = [];
  for (const [from, to] of intervals) {
    const windowStart = parseHM(day, from);
    const windowEnd = parseHM(day, to);
    for (let t = windowStart; t.plus({ minutes: durationMin }) <= windowEnd; t = t.plus({ minutes: stepMin })) {
      const s = t.toMillis();
      const e = s + durMs;
      if (s < earliest) continue;
      if (busy.some(([bs, be]) => s < be && bs < e)) continue;
      result.push({
        start: new Date(s).toISOString(),
        end: new Date(e).toISOString(),
        label: t.toFormat("HH:mm")
      });
    }
  }
  return result;
}
function upcomingDates(now, tz, n) {
  const start = DateTime2.fromJSDate(now, { zone: tz }).startOf("day");
  return Array.from({ length: n }, (_, i) => start.plus({ days: i }).toISODate());
}
function dayBoundsUtc(date, tz) {
  const d = DateTime2.fromISO(date, { zone: tz }).startOf("day");
  return { from: d.toUTC().toISO(), to: d.plus({ days: 1 }).toUTC().toISO() };
}
var toMs;
var init_slots = __esm({
  "server/slots.ts"() {
    "use strict";
    toMs = (v) => v instanceof Date ? v.getTime() : Date.parse(v);
  }
});

// server/templates.ts
function withDefaults(templateId, settings) {
  const tpl = getTemplate(templateId) ?? TEMPLATES[0];
  return { ...tpl.settings, ...settings ?? {}, labels: { ...tpl.settings.labels, ...settings?.labels ?? {} } };
}
var weekdays, baseSettings, TEMPLATES, getTemplate;
var init_templates = __esm({
  "server/templates.ts"() {
    "use strict";
    weekdays = (from, to, days = [1, 2, 3, 4, 5]) => Object.fromEntries(days.map((d) => [String(d), [[from, to]]]));
    baseSettings = (over) => ({
      emoji: "\u2728",
      accent: "#2481cc",
      description: "",
      address: "",
      contactPhone: "",
      links: [],
      welcome: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u0417\u0434\u0435\u0441\u044C \u043C\u043E\u0436\u043D\u043E \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043E\u043D\u043B\u0430\u0439\u043D \u0432 \u043F\u0430\u0440\u0443 \u043A\u0430\u0441\u0430\u043D\u0438\u0439.",
      afterBookingText: "",
      labels: { staff: "\u041C\u0430\u0441\u0442\u0435\u0440", staffPlural: "\u041C\u0430\u0441\u0442\u0435\u0440\u0430", service: "\u0423\u0441\u043B\u0443\u0433\u0430" },
      stepMin: 30,
      minLeadMin: 60,
      maxDaysAhead: 30,
      cancelHours: 3,
      chooseStaff: false,
      requirePhone: true,
      remind2h: true,
      fields: [],
      bannerFileId: "",
      bannerColor: "",
      palette: "rose",
      paletteMode: "dark",
      iconStyle: "regular",
      logoFileId: "",
      logoMode: "circle",
      logoAlpha: false,
      ...over
    });
    TEMPLATES = [
      {
        id: "beauty",
        title: "\u0411\u044C\u044E\u0442\u0438-\u043C\u0430\u0441\u0442\u0435\u0440",
        emoji: "\u{1F485}",
        pitch: "\u041C\u0430\u043D\u0438\u043A\u044E\u0440, \u043F\u0435\u0434\u0438\u043A\u044E\u0440, \u0431\u0440\u043E\u0432\u0438, \u0440\u0435\u0441\u043D\u0438\u0446\u044B. \u041E\u0434\u0438\u043D \u043C\u0430\u0441\u0442\u0435\u0440, \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E, \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F.",
        settings: baseSettings({
          emoji: "\u{1F485}",
          accent: "#d6457b",
          palette: "rose",
          description: "\u041C\u0430\u043D\u0438\u043A\u044E\u0440, \u043F\u0435\u0434\u0438\u043A\u044E\u0440 \u0438 \u0431\u0440\u043E\u0432\u0438. \u0417\u0430\u043F\u0438\u0441\u044C \u043E\u043D\u043B\u0430\u0439\u043D 24/7 \u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0441\u043B\u0443\u0433\u0443 \u0438 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0435 \u043E\u043A\u043E\u0448\u043A\u043E.",
          welcome: "\u041F\u0440\u0438\u0432\u0435\u0442! \u042F \u043C\u0430\u0441\u0442\u0435\u0440 \u043D\u043E\u0433\u0442\u0435\u0432\u043E\u0433\u043E \u0441\u0435\u0440\u0432\u0438\u0441\u0430. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0441\u043B\u0443\u0433\u0443 \u0438 \u0443\u0434\u043E\u0431\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u2014 \u044F \u043F\u0440\u0438\u0448\u043B\u044E \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435 \u043D\u0430\u043A\u0430\u043D\u0443\u043D\u0435.",
          afterBookingText: "\u0415\u0441\u043B\u0438 \u043F\u043B\u0430\u043D\u044B \u0438\u0437\u043C\u0435\u043D\u044F\u0442\u0441\u044F \u2014 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C \u0432 \xAB\u041C\u043E\u0438 \u0437\u0430\u043F\u0438\u0441\u0438\xBB, \u0447\u0442\u043E\u0431\u044B \u043E\u043A\u043E\u0448\u043A\u043E \u0434\u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0434\u0440\u0443\u0433\u043E\u043C\u0443.",
          fields: [{ key: "wish", label: "\u041F\u043E\u0436\u0435\u043B\u0430\u043D\u0438\u044F \u043F\u043E \u0434\u0438\u0437\u0430\u0439\u043D\u0443", placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u043D\u044E\u0434, \u043A\u043E\u0440\u043E\u0442\u043A\u0430\u044F \u0434\u043B\u0438\u043D\u0430", required: false }]
        }),
        staff: [{ name: "\u041C\u0430\u0441\u0442\u0435\u0440", work_hours: weekdays("10:00", "20:00", [1, 2, 3, 4, 5, 6]) }],
        services: [
          { title: "\u041C\u0430\u043D\u0438\u043A\u044E\u0440 \u0441 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435\u043C \u0433\u0435\u043B\u044C-\u043B\u0430\u043A", price: 1800, duration_min: 120 },
          { title: "\u041C\u0430\u043D\u0438\u043A\u044E\u0440 \u0431\u0435\u0437 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F", price: 900, duration_min: 60 },
          { title: "\u041D\u0430\u0440\u0430\u0449\u0438\u0432\u0430\u043D\u0438\u0435 \u043D\u043E\u0433\u0442\u0435\u0439", price: 2800, price_from: true, duration_min: 180 },
          { title: "\u041F\u0435\u0434\u0438\u043A\u044E\u0440 \u0441 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435\u043C", price: 2200, duration_min: 120 },
          { title: "\u041A\u043E\u0440\u0440\u0435\u043A\u0446\u0438\u044F \u0438 \u043E\u043A\u0440\u0430\u0448\u0438\u0432\u0430\u043D\u0438\u0435 \u0431\u0440\u043E\u0432\u0435\u0439", price: 1200, duration_min: 60 },
          { title: "\u0421\u043D\u044F\u0442\u0438\u0435 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F", price: 400, duration_min: 30 }
        ]
      },
      {
        id: "barber",
        title: "\u0411\u0430\u0440\u0431\u0435\u0440\u0448\u043E\u043F / \u043F\u0430\u0440\u0438\u043A\u043C\u0430\u0445\u0435\u0440",
        emoji: "\u{1F488}",
        pitch: "\u041D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432, \u0432\u044B\u0431\u043E\u0440 \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u0438\u043B\u0438 \xAB\u043B\u044E\u0431\u043E\u0439 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0439\xBB.",
        settings: baseSettings({
          emoji: "\u{1F488}",
          accent: "#b7791f",
          palette: "graphite",
          description: "\u041C\u0443\u0436\u0441\u043A\u0438\u0435 \u0441\u0442\u0440\u0438\u0436\u043A\u0438 \u0438 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0431\u043E\u0440\u043E\u0434\u044B. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u0438 \u0443\u0434\u043E\u0431\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F.",
          welcome: "\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C! \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0443\u0441\u043B\u0443\u0433\u0443, \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F \u2014 \u0431\u0435\u0437 \u0437\u0432\u043E\u043D\u043A\u043E\u0432 \u0438 \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F.",
          chooseStaff: true,
          stepMin: 15,
          minLeadMin: 30,
          maxDaysAhead: 21,
          cancelHours: 2
        }),
        staff: [
          { name: "\u0410\u043B\u0435\u043A\u0441\u0435\u0439", description: "\u0422\u043E\u043F-\u0431\u0430\u0440\u0431\u0435\u0440", work_hours: weekdays("10:00", "21:00", [1, 2, 3, 4, 5, 6, 7]) },
          { name: "\u0414\u043C\u0438\u0442\u0440\u0438\u0439", description: "\u0411\u0430\u0440\u0431\u0435\u0440", work_hours: weekdays("12:00", "21:00", [2, 3, 4, 5, 6]) }
        ],
        services: [
          { title: "\u041C\u0443\u0436\u0441\u043A\u0430\u044F \u0441\u0442\u0440\u0438\u0436\u043A\u0430", price: 1200, duration_min: 45 },
          { title: "\u0421\u0442\u0440\u0438\u0436\u043A\u0430 \u043C\u0430\u0448\u0438\u043D\u043A\u043E\u0439", price: 700, duration_min: 30 },
          { title: "\u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0431\u043E\u0440\u043E\u0434\u044B", price: 800, duration_min: 30 },
          { title: "\u0421\u0442\u0440\u0438\u0436\u043A\u0430 + \u0431\u043E\u0440\u043E\u0434\u0430", price: 1800, duration_min: 75 },
          { title: "\u0414\u0435\u0442\u0441\u043A\u0430\u044F \u0441\u0442\u0440\u0438\u0436\u043A\u0430", price: 900, duration_min: 30 }
        ]
      },
      {
        id: "tutor",
        title: "\u0420\u0435\u043F\u0435\u0442\u0438\u0442\u043E\u0440 / \u043F\u0441\u0438\u0445\u043E\u043B\u043E\u0433 / \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u043D\u0442",
        emoji: "\u{1F393}",
        pitch: "\u0417\u0430\u043D\u044F\u0442\u0438\u044F \u0438 \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0438\u0438 \u043E\u043D\u043B\u0430\u0439\u043D \u0438\u043B\u0438 \u043E\u0447\u043D\u043E, \u0430\u043D\u043A\u0435\u0442\u0430 \u0441 \u0446\u0435\u043B\u044C\u044E.",
        settings: baseSettings({
          emoji: "\u{1F393}",
          accent: "#4f46e5",
          palette: "sky",
          description: "\u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u0435 \u0437\u0430\u043D\u044F\u0442\u0438\u044F \u043E\u043D\u043B\u0430\u0439\u043D \u0438 \u043E\u0447\u043D\u043E. \u041F\u0435\u0440\u0432\u043E\u0435 \u043F\u0440\u043E\u0431\u043D\u043E\u0435 \u0437\u0430\u043D\u044F\u0442\u0438\u0435 \u2014 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E.",
          welcome: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u043E\u0440\u043C\u0430\u0442 \u0437\u0430\u043D\u044F\u0442\u0438\u044F \u0438 \u0443\u0434\u043E\u0431\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F. \u0421\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0441\u043E\u0437\u0432\u043E\u043D \u043F\u0440\u0438\u0448\u043B\u044E \u043F\u0435\u0440\u0435\u0434 \u043D\u0430\u0447\u0430\u043B\u043E\u043C.",
          afterBookingText: "\u0417\u0430\u043D\u044F\u0442\u0438\u0435 \u043F\u0440\u043E\u0445\u043E\u0434\u0438\u0442 \u043E\u043D\u043B\u0430\u0439\u043D. \u0421\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0441\u043E\u0437\u0432\u043E\u043D \u043F\u0440\u0438\u0448\u043B\u044E \u0432 \u044D\u0442\u043E\u0442 \u0447\u0430\u0442 \u043F\u0435\u0440\u0435\u0434 \u043D\u0430\u0447\u0430\u043B\u043E\u043C.",
          labels: { staff: "\u041F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044C", staffPlural: "\u041F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u0438", service: "\u0417\u0430\u043D\u044F\u0442\u0438\u0435" },
          stepMin: 60,
          minLeadMin: 180,
          cancelHours: 12,
          fields: [
            { key: "goal", label: "\u041A\u043B\u0430\u0441\u0441 / \u0446\u0435\u043B\u044C \u0437\u0430\u043D\u044F\u0442\u0438\u0439", placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: 9 \u043A\u043B\u0430\u0441\u0441, \u041E\u0413\u042D \u043F\u043E \u043C\u0430\u0442\u0435\u043C\u0430\u0442\u0438\u043A\u0435", required: true }
          ]
        }),
        staff: [{ name: "\u041F\u0440\u0435\u043F\u043E\u0434\u0430\u0432\u0430\u0442\u0435\u043B\u044C", work_hours: weekdays("15:00", "21:00") }],
        services: [
          { title: "\u041F\u0440\u043E\u0431\u043D\u043E\u0435 \u0437\u0430\u043D\u044F\u0442\u0438\u0435", price: 0, duration_min: 30 },
          { title: "\u0418\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u043E\u0435 \u0437\u0430\u043D\u044F\u0442\u0438\u0435", price: 1500, duration_min: 60 },
          { title: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043A \u044D\u043A\u0437\u0430\u043C\u0435\u043D\u0443", price: 2e3, duration_min: 90 },
          { title: "\u041F\u0430\u043A\u0435\u0442 4 \u0437\u0430\u043D\u044F\u0442\u0438\u044F", price: 5400, duration_min: 60, description: "\u041E\u043F\u043B\u0430\u0442\u0430 \u0437\u0430 \u043C\u0435\u0441\u044F\u0446 \u0432\u043F\u0435\u0440\u0451\u0434" }
        ]
      },
      {
        id: "wellness",
        title: "\u041C\u0430\u0441\u0441\u0430\u0436 / \u0442\u0440\u0435\u043D\u0435\u0440 / SPA",
        emoji: "\u{1F9D8}",
        pitch: "\u0421\u0435\u0430\u043D\u0441\u044B 60/90 \u043C\u0438\u043D\u0443\u0442, \u043F\u043E\u0436\u0435\u043B\u0430\u043D\u0438\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430, \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F.",
        settings: baseSettings({
          emoji: "\u{1F9D8}",
          accent: "#0f9d76",
          palette: "lilac",
          description: "\u041C\u0430\u0441\u0441\u0430\u0436 \u0438 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0435\u0430\u043D\u0441 \u0438 \u0443\u0434\u043E\u0431\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F.",
          welcome: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u0417\u0430\u043F\u0438\u0448\u0438\u0442\u0435\u0441\u044C \u043D\u0430 \u0441\u0435\u0430\u043D\u0441 \u0432 \u0443\u0434\u043E\u0431\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u2014 \u043D\u0430\u043F\u043E\u043C\u043D\u044E \u043D\u0430\u043A\u0430\u043D\u0443\u043D\u0435.",
          labels: { staff: "\u0421\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", staffPlural: "\u0421\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u044B", service: "\u0421\u0435\u0430\u043D\u0441" },
          cancelHours: 6,
          fields: [{ key: "wish", label: "\u041F\u043E\u0436\u0435\u043B\u0430\u043D\u0438\u044F \u0438\u043B\u0438 \u0437\u043E\u043D\u044B \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F", placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u0448\u0435\u044F \u0438 \u043F\u043B\u0435\u0447\u0438", required: false }]
        }),
        staff: [{ name: "\u0421\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442", work_hours: weekdays("09:00", "21:00", [1, 2, 3, 4, 5, 6]) }],
        services: [
          { title: "\u041A\u043B\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043C\u0430\u0441\u0441\u0430\u0436", price: 2500, duration_min: 60 },
          { title: "\u041C\u0430\u0441\u0441\u0430\u0436 \u0441\u043F\u0438\u043D\u044B \u0438 \u0448\u0435\u0438", price: 1500, duration_min: 30 },
          { title: "\u0410\u043D\u0442\u0438\u0446\u0435\u043B\u043B\u044E\u043B\u0438\u0442\u043D\u044B\u0439 \u043C\u0430\u0441\u0441\u0430\u0436", price: 2800, duration_min: 60 },
          { title: "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430", price: 2e3, duration_min: 60 },
          { title: "SPA-\u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430", price: 4500, duration_min: 90 }
        ]
      },
      {
        id: "auto",
        title: "\u0410\u0432\u0442\u043E: \u0434\u0435\u0442\u0435\u0439\u043B\u0438\u043D\u0433 / \u0448\u0438\u043D\u043E\u043C\u043E\u043D\u0442\u0430\u0436 / \u0441\u0435\u0440\u0432\u0438\u0441",
        emoji: "\u{1F697}",
        pitch: "\u0414\u043B\u0438\u043D\u043D\u044B\u0435 \u0440\u0430\u0431\u043E\u0442\u044B, \u0434\u0430\u043D\u043D\u044B\u0435 \u0430\u0432\u0442\u043E \u0432 \u0430\u043D\u043A\u0435\u0442\u0435, \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0431\u043E\u043A\u0441\u043E\u0432.",
        settings: baseSettings({
          emoji: "\u{1F697}",
          accent: "#e8590c",
          palette: "amber",
          description: "\u0428\u0438\u043D\u043E\u043C\u043E\u043D\u0442\u0430\u0436, \u043C\u043E\u0439\u043A\u0430, \u0434\u0435\u0442\u0435\u0439\u043B\u0438\u043D\u0433 \u0438 \u043E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u0435. \u0417\u0430\u043F\u0438\u0441\u044C \u0431\u0435\u0437 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \u0438 \u0437\u0432\u043E\u043D\u043A\u043E\u0432.",
          welcome: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u0417\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u0430\u0432\u0442\u043E \u043D\u0430 \u0443\u0434\u043E\u0431\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u2014 \u0431\u0435\u0437 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \u0438 \u0437\u0432\u043E\u043D\u043A\u043E\u0432.",
          labels: { staff: "\u0411\u043E\u043A\u0441", staffPlural: "\u0411\u043E\u043A\u0441\u044B", service: "\u0420\u0430\u0431\u043E\u0442\u0430" },
          stepMin: 30,
          minLeadMin: 60,
          maxDaysAhead: 14,
          cancelHours: 2,
          remind2h: true,
          fields: [
            { key: "car", label: "\u041C\u0430\u0440\u043A\u0430 \u0438 \u043C\u043E\u0434\u0435\u043B\u044C \u0430\u0432\u0442\u043E", placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: Lada Granta", required: true },
            { key: "plate", label: "\u0413\u043E\u0441\u043D\u043E\u043C\u0435\u0440", placeholder: "\u0410123\u0412\u0421 163", required: false }
          ]
        }),
        staff: [{ name: "\u0411\u043E\u043A\u0441 1", work_hours: weekdays("09:00", "20:00", [1, 2, 3, 4, 5, 6, 7]) }],
        services: [
          { title: "\u0428\u0438\u043D\u043E\u043C\u043E\u043D\u0442\u0430\u0436 R13\u2013R16", price: 1600, duration_min: 45 },
          { title: "\u0428\u0438\u043D\u043E\u043C\u043E\u043D\u0442\u0430\u0436 R17\u2013R20", price: 2400, duration_min: 60 },
          { title: "\u041A\u043E\u043C\u043F\u043B\u0435\u043A\u0441\u043D\u0430\u044F \u043C\u043E\u0439\u043A\u0430", price: 900, duration_min: 45 },
          { title: "\u041F\u043E\u043B\u0438\u0440\u043E\u0432\u043A\u0430 \u043A\u0443\u0437\u043E\u0432\u0430", price: 8e3, price_from: true, duration_min: 240 },
          { title: "\u0425\u0438\u043C\u0447\u0438\u0441\u0442\u043A\u0430 \u0441\u0430\u043B\u043E\u043D\u0430", price: 6e3, price_from: true, duration_min: 240 },
          { title: "\u0417\u0430\u043C\u0435\u043D\u0430 \u043C\u0430\u0441\u043B\u0430", price: 700, duration_min: 30 }
        ]
      }
    ];
    getTemplate = (id) => TEMPLATES.find((t) => t.id === id);
  }
});

// server/store.ts
import { randomBytes } from "node:crypto";
import { DateTime as DateTime3 } from "luxon";
async function upsertUser(db2, u) {
  const [row2] = await db2.query(
    `insert into users (tg_id, first_name, username) values ($1, $2, $3)
     on conflict (tg_id) do update set first_name = excluded.first_name, username = excluded.username, seen_at = now()
     returning last_business_id`,
    [u.id, u.first_name ?? "", u.username ?? null]
  );
  return row2;
}
async function setLastBusiness(db2, tgId, businessId) {
  await db2.query(`update users set last_business_id = $2 where tg_id = $1`, [tgId, businessId]);
}
async function touchClient(db2, businessId, u) {
  await db2.query(
    `insert into clients (business_id, tg_id, name) values ($1, $2, $3)
     on conflict (business_id, tg_id) do update set last_seen = now(), blocked_bot = false`,
    [businessId, u.id, [u.first_name, u.last_name].filter(Boolean).join(" ")]
  );
}
function slugify(name) {
  const map = {
    \u0430: "a",
    \u0431: "b",
    \u0432: "v",
    \u0433: "g",
    \u0434: "d",
    \u0435: "e",
    \u0451: "e",
    \u0436: "zh",
    \u0437: "z",
    \u0438: "i",
    \u0439: "y",
    \u043A: "k",
    \u043B: "l",
    \u043C: "m",
    \u043D: "n",
    \u043E: "o",
    \u043F: "p",
    \u0440: "r",
    \u0441: "s",
    \u0442: "t",
    \u0443: "u",
    \u0444: "f",
    \u0445: "h",
    \u0446: "c",
    \u0447: "ch",
    \u0448: "sh",
    \u0449: "sch",
    \u044A: "",
    \u044B: "y",
    \u044C: "",
    \u044D: "e",
    \u044E: "yu",
    \u044F: "ya"
  };
  const base = name.toLowerCase().split("").map((c) => map[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
  return base.length >= 3 ? base : `biz-${base || "new"}`;
}
async function createBusinessFromTemplate(db2, opts) {
  const tpl = getTemplate(opts.templateId);
  if (!tpl) throw new UserError("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0448\u0430\u0431\u043B\u043E\u043D");
  const name = opts.name.trim().slice(0, 80);
  if (name.length < 2) throw new UserError("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435");
  return db2.tx(async (tx) => {
    let slug = opts.slug ? slugify(opts.slug) : slugify(name);
    const taken = await tx.query(`select 1 from businesses where slug = $1`, [slug]);
    if (taken.length) {
      if (opts.slug) throw new UserError("\u0422\u0430\u043A\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442\u0430");
      slug = `${slug.slice(0, 28)}-${randomBytes(2).toString("hex")}`;
    }
    const [b] = await tx.query(
      `insert into businesses (slug, name, template, timezone, settings, created_by)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [slug, name, tpl.id, opts.timezone ?? "Europe/Moscow", tpl.settings, opts.createdBy ?? null]
    );
    for (const [i, s] of tpl.staff.entries()) {
      await tx.query(
        `insert into staff (business_id, name, description, work_hours, sort) values ($1, $2, $3, $4, $5)`,
        [b.id, s.name, s.description ?? "", s.work_hours, i]
      );
    }
    for (const [i, s] of tpl.services.entries()) {
      await tx.query(
        `insert into services (business_id, title, description, price, price_from, duration_min, sort)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [b.id, s.title, s.description ?? "", s.price, s.price_from ?? false, s.duration_min, i]
      );
    }
    if (opts.ownerTgId) {
      await tx.query(`insert into business_admins (business_id, tg_id, role) values ($1, $2, 'owner')`, [b.id, opts.ownerTgId]);
    }
    return rowToBusiness(b);
  });
}
async function getBusiness(db2, idOrSlug) {
  const rows = typeof idOrSlug === "number" ? await db2.query(`select * from businesses where id = $1`, [idOrSlug]) : await db2.query(`select * from businesses where slug = $1`, [idOrSlug.toLowerCase()]);
  return rows[0] ? rowToBusiness(rows[0]) : null;
}
async function roleFor(db2, tgId, businessId, superadmins) {
  if (superadmins.includes(tgId)) return "super";
  const [r] = await db2.query(`select role from business_admins where business_id = $1 and tg_id = $2`, [businessId, tgId]);
  return r?.role ?? null;
}
async function businessesOfClient(db2, tgId, limit = 10) {
  const rows = await db2.query(
    `select b.* from businesses b
     join (select business_id, max(last_seen) as ls from clients where tg_id in ${samePerson(1)} group by business_id) c on c.business_id = b.id
     where b.status = 'active' order by c.ls desc limit $2`,
    [tgId, limit]
  );
  return rows.map(rowToBusiness);
}
async function businessesOfAdmin(db2, tgId) {
  const rows = await db2.query(
    `select b.*, a.role from business_admins a join businesses b on b.id = a.business_id
     where a.tg_id = $1 order by b.created_at`,
    [tgId]
  );
  return rows.map((r) => ({ ...rowToBusiness(r), role: r.role }));
}
async function updateBusiness(db2, businessId, patch) {
  const b = await getBusiness(db2, businessId);
  if (!b) throw new UserError("\u0411\u0438\u0437\u043D\u0435\u0441 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
  if (patch.timezone && !DateTime3.local().setZone(patch.timezone).isValid) throw new UserError("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0447\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441");
  const settings = { ...b.settings, ...patch.settings ?? {} };
  if (settings.stepMin < 5 || settings.stepMin > 240) throw new UserError("\u0428\u0430\u0433 \u0441\u0435\u0442\u043A\u0438 \u2014 \u043E\u0442 5 \u0434\u043E 240 \u043C\u0438\u043D\u0443\u0442");
  const [row2] = await db2.query(
    `update businesses set name = $2, timezone = $3, settings = $4 where id = $1 returning *`,
    [businessId, (patch.name ?? b.name).trim().slice(0, 80), patch.timezone ?? b.timezone, settings]
  );
  return rowToBusiness(row2);
}
async function createInvite(db2, businessId, role, createdBy) {
  const code = randomBytes(9).toString("base64url");
  await db2.query(`insert into invites (code, business_id, role, created_by) values ($1, $2, $3, $4)`, [
    code,
    businessId,
    role,
    createdBy
  ]);
  return code;
}
async function claimInvite(db2, code, tgId) {
  return db2.tx(async (tx) => {
    const [inv] = await tx.query(`select * from invites where code = $1 for update`, [code]);
    if (!inv) throw new UserError("\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E");
    if (inv.used_by && inv.used_by !== tgId) throw new UserError("\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u0443\u0436\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043E");
    if (new Date(inv.expires_at) < /* @__PURE__ */ new Date()) throw new UserError("\u0421\u0440\u043E\u043A \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F \u0438\u0441\u0442\u0451\u043A");
    await tx.query(`update invites set used_by = $2, used_at = now() where code = $1`, [code, tgId]);
    await tx.query(
      `insert into business_admins (business_id, tg_id, role) values ($1, $2, $3)
       on conflict (business_id, tg_id) do update set role = case when business_admins.role = 'owner' then 'owner' else excluded.role end`,
      [inv.business_id, tgId, inv.role]
    );
    const [b] = await tx.query(`select * from businesses where id = $1`, [inv.business_id]);
    return { business: rowToBusiness(b), role: inv.role };
  });
}
async function busyFor(db2, businessId, staffIds, from, to) {
  const bookings = await db2.query(
    `select staff_id, starts_at, ends_at from bookings
     where business_id = $1 and status = 'confirmed' and starts_at < $3 and ends_at > $2`,
    [businessId, from, to]
  );
  const off = await db2.query(
    `select staff_id, starts_at, ends_at from time_off where business_id = $1 and starts_at < $3 and ends_at > $2`,
    [businessId, from, to]
  );
  const map = new Map(staffIds.map((id) => [id, []]));
  for (const b of bookings) map.get(b.staff_id)?.push({ start: b.starts_at, end: b.ends_at });
  for (const o of off) {
    for (const id of staffIds) {
      if (o.staff_id === null || o.staff_id === id) map.get(id).push({ start: o.starts_at, end: o.ends_at });
    }
  }
  return map;
}
async function availability(db2, opts) {
  const { business } = opts;
  const now = opts.now ?? /* @__PURE__ */ new Date();
  const [service] = await db2.query(`select * from services where id = $1 and business_id = $2 and active`, [
    opts.serviceId,
    business.id
  ]);
  if (!service) throw new UserError("\u0423\u0441\u043B\u0443\u0433\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
  let staff = await listStaff(db2, business.id);
  if (opts.staffId) staff = staff.filter((s2) => s2.id === opts.staffId);
  if (!staff.length) return {};
  const s = business.settings;
  const days = Math.min(opts.days, s.maxDaysAhead + 1);
  const dates = upcomingDates(now, business.timezone, days);
  const from = dayBoundsUtc(dates[0], business.timezone).from;
  const to = dayBoundsUtc(dates[dates.length - 1], business.timezone).to;
  const busy = await busyFor(db2, business.id, staff.map((x) => x.id), from, to);
  const result = {};
  for (const date of dates) {
    const byStart = /* @__PURE__ */ new Map();
    for (const st of staff) {
      const slots = computeSlots({
        date,
        tz: business.timezone,
        workHours: st.work_hours,
        stepMin: s.stepMin,
        durationMin: service.duration_min,
        busy: busy.get(st.id) ?? [],
        now,
        minLeadMin: s.minLeadMin,
        maxDaysAhead: s.maxDaysAhead
      });
      for (const slot of slots) {
        const ex = byStart.get(slot.start);
        if (ex) ex.staffIds.push(st.id);
        else byStart.set(slot.start, { ...slot, staffIds: [st.id] });
      }
    }
    const list = [...byStart.values()].sort((a, b) => a.start.localeCompare(b.start));
    if (list.length) result[date] = list;
  }
  return result;
}
async function createBooking(db2, opts) {
  const { business, client } = opts;
  if (business.status !== "active") throw new UserError("\u0417\u0430\u043F\u0438\u0441\u044C \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
  const s = business.settings;
  const name = client.name.trim().slice(0, 80);
  if (name.length < 2) throw new UserError("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0438\u043C\u044F");
  let phone = client.phone.trim();
  if (s.requirePhone && !phone) throw new UserError("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0442\u0435\u043B\u0435\u0444\u043E\u043D");
  if (phone) {
    const pc = checkPhone(phone);
    if (!pc.ok) throw new UserError(pc.error);
    phone = pc.phone;
  }
  const answers = {};
  for (const f of s.fields) {
    const v = (opts.answers?.[f.key] ?? "").trim().slice(0, 300);
    if (f.required && !v) throw new UserError(`\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043F\u043E\u043B\u0435 \xAB${f.label}\xBB`);
    if (v) answers[f.key] = v;
  }
  const date = DateTime3.fromISO(opts.start).setZone(business.timezone).toISODate();
  const avail = await availability(db2, {
    business,
    serviceId: opts.serviceId,
    staffId: opts.staffId,
    days: s.maxDaysAhead + 1,
    now: opts.now
  });
  const startIso = new Date(opts.start).toISOString();
  const slot = (avail[date] ?? []).find((x) => x.start === startIso);
  if (!slot) throw new BookingConflict();
  const [service] = await listServices(db2, business.id).then((l) => l.filter((x) => x.id === opts.serviceId));
  for (const staffId of slot.staffIds) {
    try {
      const [row2] = await db2.query(
        `insert into bookings (business_id, staff_id, service_id, service_title, price, client_tg_id, client_name,
           client_phone, answers, comment, starts_at, ends_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
        [
          business.id,
          staffId,
          service.id,
          service.title,
          service.price,
          client.tgId,
          name,
          phone,
          answers,
          (opts.comment ?? "").trim().slice(0, 500),
          slot.start,
          slot.end
        ]
      );
      await db2.query(
        `insert into clients (business_id, tg_id, name, phone) values ($1, $2, $3, $4)
         on conflict (business_id, tg_id) do update set name = excluded.name, phone = excluded.phone, last_seen = now()`,
        [business.id, client.tgId, name, phone]
      );
      return row2;
    } catch (e) {
      if (isOverlapError(e)) continue;
      throw e;
    }
  }
  throw new BookingConflict();
}
async function getBookingById(db2, id) {
  const [r] = await db2.query(`select * from bookings where id = $1`, [id]);
  return r ?? null;
}
async function cancelBooking(db2, opts) {
  const b = await getBookingById(db2, opts.bookingId);
  if (!b || b.business_id !== opts.business.id) throw new UserError("\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
  if (b.status !== "confirmed") throw new UserError("\u0417\u0430\u043F\u0438\u0441\u044C \u0443\u0436\u0435 \u043D\u0435\u0430\u043A\u0442\u0438\u0432\u043D\u0430");
  if (opts.by === "client") {
    const [mine] = await db2.query(`select 1 as ok where $1::bigint in ${samePerson(2)}`, [b.client_tg_id, opts.tgId]);
    if (!mine) throw new UserError("\u042D\u0442\u043E \u043D\u0435 \u0432\u0430\u0448\u0430 \u0437\u0430\u043F\u0438\u0441\u044C");
    const hoursLeft = (new Date(b.starts_at).getTime() - (opts.now ?? /* @__PURE__ */ new Date()).getTime()) / 36e5;
    if (hoursLeft < opts.business.settings.cancelHours) {
      throw new UserError(`\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u043D\u043B\u0430\u0439\u043D \u043C\u043E\u0436\u043D\u043E \u043D\u0435 \u043F\u043E\u0437\u0436\u0435 \u0447\u0435\u043C \u0437\u0430 ${opts.business.settings.cancelHours} \u0447. \u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043C\u0430\u0441\u0442\u0435\u0440\u0443.`);
    }
  }
  const [row2] = await db2.query(
    `update bookings set status = 'cancelled', cancelled_by = $2 where id = $1 returning *`,
    [b.id, opts.by]
  );
  return row2;
}
async function setBookingStatus(db2, businessId, id, status2) {
  const [row2] = await db2.query(
    `update bookings set status = $3 where id = $1 and business_id = $2 and status <> 'cancelled' returning *`,
    [id, businessId, status2]
  );
  if (!row2) throw new UserError("\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
  return row2;
}
async function businessStats(db2, businessId) {
  const [r] = await db2.query(
    `select
       (select count(*) from clients where business_id = $1)::int as clients,
       (select count(*) from bookings where business_id = $1 and status in ('confirmed','done'))::int as bookings,
       (select count(*) from bookings where business_id = $1 and status = 'confirmed' and starts_at > now())::int as upcoming,
       (select count(*) from bookings where business_id = $1 and status = 'cancelled')::int as cancelled,
       (select coalesce(sum(price),0) from bookings where business_id = $1 and status = 'done'
          and starts_at > now() - interval '30 days')::int as revenue_30d`,
    [businessId]
  );
  return r;
}
async function allBusinesses(db2) {
  return db2.query(
    `select b.id, b.slug, b.name, b.template, b.status, b.created_at,
       (select count(*) from clients c where c.business_id = b.id)::int as clients,
       (select count(*) from bookings k where k.business_id = b.id and k.status in ('confirmed','done'))::int as bookings,
       (select count(*) from business_admins a where a.business_id = b.id and a.role = 'owner')::int as owners
     from businesses b order by b.created_at desc`
  );
}
async function platformStats(db2) {
  const [r] = await db2.query(
    `select (select count(*) from businesses)::int as businesses,
            (select count(*) from users)::int as users,
            (select count(*) from bookings)::int as bookings,
            (select count(*) from users where seen_at > now() - interval '30 days')::int as active_30d`
  );
  return r;
}
var UserError, rowToBusiness, samePerson, listServices, listStaff, PORTFOLIO_MAX, listPortfolio, listAlbums, BookingConflict, clientBookings, bookingsInRange;
var init_store = __esm({
  "server/store.ts"() {
    "use strict";
    init_phone();
    init_db();
    init_slots();
    init_templates();
    UserError = class extends Error {
    };
    rowToBusiness = (r) => ({ ...r, settings: withDefaults(r.template, r.settings) });
    samePerson = (n) => `(select $${n}::bigint union select tg_id from users where person_id is not null and person_id = (select coalesce(person_id, tg_id) from users where tg_id = $${n}))`;
    listServices = (db2, businessId, all = false) => db2.query(
      `select * from services where business_id = $1 ${all ? "" : "and active"} order by sort, id`,
      [businessId]
    );
    listStaff = (db2, businessId, all = false) => db2.query(`select * from staff where business_id = $1 ${all ? "" : "and active"} order by sort, id`, [businessId]);
    PORTFOLIO_MAX = 150;
    listPortfolio = (db2, businessId) => db2.query(
      `select id, file_id, caption, staff_id, album_id from portfolio where business_id = $1 order by sort, id desc limit ${PORTFOLIO_MAX}`,
      [businessId]
    );
    listAlbums = (db2, businessId) => db2.query(
      `select id, title, description, service_id, sort from albums where business_id = $1 order by sort, id`,
      [businessId]
    );
    BookingConflict = class extends UserError {
      constructor() {
        super("\u042D\u0442\u043E \u0432\u0440\u0435\u043C\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u043E \u0437\u0430\u043D\u044F\u043B\u0438. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0435, \u043F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430.");
      }
    };
    clientBookings = (db2, businessId, tgId) => db2.query(
      `select * from bookings where business_id = $1 and client_tg_id in ${samePerson(2)}
     and (starts_at > now() - interval '30 days') order by starts_at desc limit 30`,
      [businessId, tgId]
    );
    bookingsInRange = (db2, businessId, from, to) => db2.query(
      `select b.*, s.name as staff_name from bookings b join staff s on s.id = b.staff_id
     where b.business_id = $1 and b.starts_at >= $2 and b.starts_at < $3 order by b.starts_at`,
      [businessId, from, to]
    );
  }
});

// server/links.ts
var links_exports = {};
__export(links_exports, {
  answerLink: () => answerLink,
  autoLink: () => autoLink,
  personIds: () => personIds,
  platformName: () => platformName,
  rememberPhone: () => rememberPhone
});
async function personIds(db2, id) {
  const rows = await db2.query(
    `select tg_id from users where coalesce(person_id, tg_id) = (select coalesce(person_id, tg_id) from users where tg_id = $1)`,
    [id]
  );
  const ids = rows.map((r) => Number(r.tg_id));
  return ids.length ? ids : [Number(id)];
}
async function rememberPhone(db2, id, phone, verified = false) {
  if (verified) await db2.query(`update users set phone = $2, phone_verified = true where tg_id = $1`, [id, phone]);
  else await db2.query(`update users set phone = $2 where tg_id = $1 and not phone_verified`, [id, phone]);
}
async function merge(db2, a, b) {
  await db2.tx(async (t) => {
    const [p] = await t.query(`select coalesce(person_id, tg_id) as p from users where tg_id = $1`, [a]);
    const person = Number(p?.p ?? a);
    await t.query(
      `update users set person_id = $1 where tg_id = any($2::bigint[]) or coalesce(person_id, tg_id) in (
         select coalesce(person_id, tg_id) from users where tg_id = any($2::bigint[]))`,
      [person, [a, b]]
    );
  });
}
async function detach(db2, id) {
  const ids = (await personIds(db2, id)).filter((x) => x !== Number(id));
  await db2.query(`update users set person_id = null where tg_id = $1`, [id]);
  if (ids.length === 1) await db2.query(`update users set person_id = null where tg_id = $1`, [ids[0]]);
  else if (ids.length > 1) await db2.query(`update users set person_id = $1 where tg_id = any($2::bigint[])`, [ids[0], ids]);
}
async function autoLink(db2, fromId, phone, context) {
  const [me] = await db2.query(`select 1 from users where tg_id = $1 and phone = $2 and phone_verified`, [fromId, phone]);
  if (!me) return [];
  const mine = await personIds(db2, fromId);
  const candidates = await db2.query(
    `select u.tg_id from users u
     where u.phone = $1 and u.phone_verified and u.tg_id <> all($2::bigint[]) and sign(u.tg_id) <> sign($3::bigint)
       and not exists (
         select 1 from link_requests r
         where ((r.from_id = $3 and r.to_id = u.tg_id) or (r.from_id = u.tg_id and r.to_id = $3)) and r.status = 'declined'
       )
     limit 3`,
    [phone, mine, fromId]
  );
  const notices = [];
  for (const c of candidates) {
    const toId = Number(c.tg_id);
    await merge(db2, toId, fromId);
    const [req] = await db2.query(
      `insert into link_requests (from_id, to_id, phone, status, answered_at) values ($1, $2, $3, 'accepted', now()) returning id`,
      [fromId, toId, phone]
    );
    const id = Number(req.id);
    const from = platformName(fromId);
    const what = context ? `\u0412 ${from} \u0432\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u043B\u0438\u0441\u044C \u043A \xAB${esc(context.businessName)}\xBB \u043D\u0430 <b>${esc(fmtWhen(context.startsAt, context.timezone))}</b>.` : `\u0412 ${from} \u0443\u043A\u0430\u0437\u0430\u043D \u0432\u0430\u0448 \u043D\u043E\u043C\u0435\u0440 <code>${esc(phone)}</code>.`;
    notices.push({
      requestId: id,
      toId,
      html: [
        `<b>\u0417\u0430\u043F\u0438\u0441\u044C \u0438\u0437 ${from}</b>`,
        what,
        "",
        `\u0410\u043A\u043A\u0430\u0443\u043D\u0442\u044B \u0441\u0432\u044F\u0437\u0430\u043D\u044B \u043F\u043E \u043D\u043E\u043C\u0435\u0440\u0443 <code>${esc(phone)}</code>: \u0437\u0430\u043F\u0438\u0441\u0438 \u0432\u0438\u0434\u043D\u044B \u0438 \u0437\u0434\u0435\u0441\u044C, \u0438 \u0432 ${from}, \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043F\u0440\u0438\u0445\u043E\u0434\u044F\u0442 \u0432 \u043E\u0431\u0430 \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u0430.`,
        "<i>\u0415\u0441\u043B\u0438 \u044D\u0442\u043E \u0431\u044B\u043B\u0438 \u043D\u0435 \u0432\u044B \u2014 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u042D\u0442\u043E \u043D\u0435 \u044F\xBB.</i>"
      ].join("\n"),
      kb: [[{ text: "\u042D\u0442\u043E \u043D\u0435 \u044F", cb: `lnk:${id}:n` }]]
    });
  }
  return notices;
}
async function answerLink(db2, requestId, answeredBy, yes) {
  const [r] = await db2.query(`select from_id, to_id, status from link_requests where id = $1`, [requestId]);
  if (!r || Number(r.to_id) !== Number(answeredBy)) return null;
  if (yes) return { html: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442\u044B \u0441\u0432\u044F\u0437\u0430\u043D\u044B." };
  if (r.status === "declined") return { html: "\u0421\u0432\u044F\u0437\u044C \u0443\u0436\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430." };
  await detach(db2, Number(r.from_id));
  await db2.query(`update link_requests set status = 'declined', answered_at = now() where id = $1`, [requestId]);
  return { html: "\u0421\u0432\u044F\u0437\u044C \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430: \u0437\u0430\u043F\u0438\u0441\u0438 \u0438\u0437 \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u0430 \u0437\u0434\u0435\u0441\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0432\u0438\u0434\u043D\u044B, \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0442\u0443\u0434\u0430 \u043D\u0435 \u043F\u0440\u0438\u0445\u043E\u0434\u044F\u0442." };
}
var platformName;
var init_links = __esm({
  "server/links.ts"() {
    "use strict";
    init_format();
    platformName = (id) => id < 0 ? "MAX" : "Telegram";
  }
});

// server/max-ca.ts
var RUSSIAN_TRUSTED_ROOT_CA;
var init_max_ca = __esm({
  "server/max-ca.ts"() {
    "use strict";
    RUSSIAN_TRUSTED_ROOT_CA = `
-----BEGIN CERTIFICATE-----
MIIFwjCCA6qgAwIBAgICEAAwDQYJKoZIhvcNAQELBQAwcDELMAkGA1UEBhMCUlUx
PzA9BgNVBAoMNlRoZSBNaW5pc3RyeSBvZiBEaWdpdGFsIERldmVsb3BtZW50IGFu
ZCBDb21tdW5pY2F0aW9uczEgMB4GA1UEAwwXUnVzc2lhbiBUcnVzdGVkIFJvb3Qg
Q0EwHhcNMjIwMzAxMjEwNDE1WhcNMzIwMjI3MjEwNDE1WjBwMQswCQYDVQQGEwJS
VTE/MD0GA1UECgw2VGhlIE1pbmlzdHJ5IG9mIERpZ2l0YWwgRGV2ZWxvcG1lbnQg
YW5kIENvbW11bmljYXRpb25zMSAwHgYDVQQDDBdSdXNzaWFuIFRydXN0ZWQgUm9v
dCBDQTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAMfFOZ8pUAL3+r2n
qqE0Zp52selXsKGFYoG0GM5bwz1bSFtCt+AZQMhkWQheI3poZAToYJu69pHLKS6Q
XBiwBC1cvzYmUYKMYZC7jE5YhEU2bSL0mX7NaMxMDmH2/NwuOVRj8OImVa5s1F4U
zn4Kv3PFlDBjjSjXKVY9kmjUBsXQrIHeaqmUIsPIlNWUnimXS0I0abExqkbdrXbX
YwCOXhOO2pDUx3ckmJlCMUGacUTnylyQW2VsJIyIGA8V0xzdaeUXg0VZ6ZmNUr5Y
Ber/EAOLPb8NYpsAhJe2mXjMB/J9HNsoFMBFJ0lLOT/+dQvjbdRZoOT8eqJpWnVD
U+QL/qEZnz57N88OWM3rabJkRNdU/Z7x5SFIM9FrqtN8xewsiBWBI0K6XFuOBOTD
4V08o4TzJ8+Ccq5XlCUW2L48pZNCYuBDfBh7FxkB7qDgGDiaftEkZZfApRg2E+M9
G8wkNKTPLDc4wH0FDTijhgxR3Y4PiS1HL2Zhw7bD3CbslmEGgfnnZojNkJtcLeBH
BLa52/dSwNU4WWLubaYSiAmA9IUMX1/RpfpxOxd4Ykmhz97oFbUaDJFipIggx5sX
ePAlkTdWnv+RWBxlJwMQ25oEHmRguNYf4Zr/Rxr9cS93Y+mdXIZaBEE0KS2iLRqa
OiWBki9IMQU4phqPOBAaG7A+eP8PAgMBAAGjZjBkMB0GA1UdDgQWBBTh0YHlzlpf
BKrS6badZrHF+qwshzAfBgNVHSMEGDAWgBTh0YHlzlpfBKrS6badZrHF+qwshzAS
BgNVHRMBAf8ECDAGAQH/AgEEMA4GA1UdDwEB/wQEAwIBhjANBgkqhkiG9w0BAQsF
AAOCAgEAALIY1wkilt/urfEVM5vKzr6utOeDWCUczmWX/RX4ljpRdgF+5fAIS4vH
tmXkqpSCOVeWUrJV9QvZn6L227ZwuE15cWi8DCDal3Ue90WgAJJZMfTshN4OI8cq
W9E4EG9wglbEtMnObHlms8F3CHmrw3k6KmUkWGoa+/ENmcVl68u/cMRl1JbW2bM+
/3A+SAg2c6iPDlehczKx2oa95QW0SkPPWGuNA/CE8CpyANIhu9XFrj3RQ3EqeRcS
AQQod1RNuHpfETLU/A2gMmvn/w/sx7TB3W5BPs6rprOA37tutPq9u6FTZOcG1Oqj
C/B7yTqgI7rbyvox7DEXoX7rIiEqyNNUguTk/u3SZ4VXE2kmxdmSh3TQvybfbnXV
4JbCZVaqiZraqc7oZMnRoWrXRG3ztbnbes/9qhRGI7PqXqeKJBztxRTEVj8ONs1d
WN5szTwaPIvhkhO3CO5ErU2rVdUr89wKpNXbBODFKRtgxUT70YpmJ46VVaqdAhOZ
D9EUUn4YaeLaS8AjSF/h7UkjOibNc4qVDiPP+rkehFWM66PVnP1Msh93tc+taIfC
EYVMxjh8zNbFuoc7fzvvrFILLe7ifvEIUqSVIC/AzplM/Jxw7buXFeGP1qVCBEHq
391d/9RAfaZ12zkwFsl+IKwE/OZxW8AHa9i1p4GO0YSNuczzEm4=
-----END CERTIFICATE-----
`;
  }
});

// server/max.ts
var max_exports = {};
__export(max_exports, {
  MAX_UPDATES: () => MAX_UPDATES,
  MaxApiError: () => MaxApiError,
  btnsFromTelegram: () => btnsFromTelegram,
  decodeMaxStart: () => decodeMaxStart,
  fromMaxUserId: () => fromMaxUserId,
  isMaxUser: () => isMaxUser,
  maxAnswerCallback: () => maxAnswerCallback,
  maxApi: () => maxApi,
  maxKeyboard: () => maxKeyboard,
  maxSend: () => maxSend,
  setMaxApi: () => setMaxApi,
  setupMax: () => setupMax,
  toMaxUserId: () => toMaxUserId
});
import { request } from "node:https";
import { rootCertificates } from "node:tls";
function realApi(token) {
  return {
    call: (method, path, query, body) => new Promise((resolve, reject) => {
      const qs = query ? `?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}` : "";
      const data = body === void 0 ? void 0 : Buffer.from(JSON.stringify(body));
      const req = request(
        {
          host: HOST,
          path: `${path}${qs}`,
          method,
          ca: CA,
          timeout: 15e3,
          headers: { authorization: token, ...data ? { "content-type": "application/json", "content-length": data.length } : {} }
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            let json2 = null;
            try {
              json2 = text ? JSON.parse(text) : {};
            } catch {
            }
            if ((res.statusCode ?? 500) >= 400) reject(new MaxApiError(res.statusCode ?? 500, json2?.message ?? json2?.code ?? text.slice(0, 200)));
            else resolve(json2);
          });
        }
      );
      req.on("timeout", () => req.destroy(new Error("MAX timeout")));
      req.on("error", reject);
      if (data) req.write(data);
      req.end();
    })
  };
}
function setMaxApi(api2) {
  override = api2;
}
function maxApi() {
  if (override) return override;
  const token = config.maxBotToken;
  if (!token) throw new Error("MAX_BOT_TOKEN \u043D\u0435 \u0437\u0430\u0434\u0430\u043D");
  if (cached?.token !== token) cached = { token, api: realApi(token) };
  return cached.api;
}
function maxKeyboard(rows) {
  const buttons = rows.map(
    (row2) => row2.map((b) => {
      if (b.contact) return { type: "request_contact", text: b.text.slice(0, 128) };
      if (b.app) {
        const payload = encodeMaxStart(b.app);
        return { type: "open_app", text: b.text.slice(0, 128), web_app: config.maxBotName, ...payload ? { payload } : {} };
      }
      if (b.url) return { type: "link", text: b.text.slice(0, 128), url: b.url };
      return { type: "callback", text: b.text.slice(0, 128), payload: b.cb ?? "" };
    })
  ).filter((r) => r.length);
  return buttons.length ? [{ type: "inline_keyboard", payload: { buttons } }] : [];
}
function btnsFromTelegram(extra) {
  const kb = extra?.reply_markup?.inline_keyboard;
  if (!kb) return [];
  return kb.map(
    (row2) => row2.map((b) => {
      if (b.web_app?.url) {
        const q = new URL(b.web_app.url).searchParams;
        return { text: b.text, app: { b: q.get("b") ?? void 0, view: q.get("view") ?? void 0 } };
      }
      if (b.url) return { text: b.text, url: b.url };
      return { text: b.text, cb: b.callback_data ?? "" };
    })
  );
}
async function maxSend(internalId, html, rows = []) {
  const attachments = maxKeyboard(rows);
  return maxApi().call("POST", "/messages", { user_id: toMaxUserId(internalId), disable_link_preview: "true" }, {
    text: html.slice(0, 4e3),
    format: "html",
    ...attachments.length ? { attachments } : {}
  });
}
async function setupMax(webhookUrl2) {
  const api2 = maxApi();
  const me = await api2.call("GET", "/me");
  if (me?.username) (await Promise.resolve().then(() => (init_config(), config_exports))).runtime.maxBotName = me.username;
  const subs = await api2.call("GET", "/subscriptions");
  const have = (subs?.subscriptions ?? []).map((s) => s.url);
  if (!have.includes(webhookUrl2)) {
    for (const url of have) await api2.call("DELETE", "/subscriptions", { url }).catch(() => {
    });
    await api2.call("POST", "/subscriptions", void 0, { url: webhookUrl2, update_types: MAX_UPDATES, secret: config.maxWebhookSecret });
    await api2.call("PATCH", "/me/commands", void 0, {
      commands: [
        { name: "start", description: "\u0413\u043B\u0430\u0432\u043D\u043E\u0435 \u043C\u0435\u043D\u044E" },
        { name: "masters", description: "\u041C\u043E\u0438 \u043C\u0430\u0441\u0442\u0435\u0440\u0430" },
        { name: "admin", description: "\u041F\u0430\u043D\u0435\u043B\u044C \u0434\u043B\u044F \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0435\u0432 \u0431\u0438\u0437\u043D\u0435\u0441\u0430" },
        { name: "id", description: "\u041C\u043E\u0439 id \u0432 MAX" }
      ]
    }).catch((e) => console.error("max commands", e));
  }
  return { bot: me?.username ?? "", webhook: webhookUrl2 };
}
var isMaxUser, toMaxUserId, fromMaxUserId, HOST, CA, MaxApiError, override, cached, maxAnswerCallback, MAX_UPDATES;
var init_max = __esm({
  "server/max.ts"() {
    "use strict";
    init_config();
    init_max_ca();
    isMaxUser = (id) => id < 0;
    toMaxUserId = (internalId) => -internalId;
    fromMaxUserId = (maxUserId) => -Math.abs(maxUserId);
    HOST = "platform-api2.max.ru";
    CA = [...rootCertificates, RUSSIAN_TRUSTED_ROOT_CA];
    MaxApiError = class extends Error {
      constructor(error_code, description) {
        super(`MAX ${error_code}: ${description}`);
        this.error_code = error_code;
        this.description = description;
      }
      error_code;
      description;
    };
    override = null;
    cached = null;
    maxAnswerCallback = (callbackId, notification = "\u041E\u0442\u043A\u0440\u044B\u0432\u0430\u044E\u2026") => maxApi().call("POST", "/answers", { callback_id: callbackId }, { notification }).catch(() => {
    });
    MAX_UPDATES = ["bot_started", "message_created", "message_callback"];
  }
});

// server/telegram.ts
import { Api } from "grammy";
function rawApi() {
  api ??= new Api(config.botToken);
  return api;
}
function tg() {
  if (override2) return override2;
  const a = rawApi();
  return {
    sendMessage: async (chatId, html, extra) => {
      if (chatId < 0) {
        const { maxSend: maxSend2, btnsFromTelegram: btnsFromTelegram2 } = await Promise.resolve().then(() => (init_max(), max_exports));
        return maxSend2(chatId, html, btnsFromTelegram2(extra));
      }
      return a.sendMessage(chatId, html, { parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...extra });
    },
    sendPhoto: async (chatId, photo2, caption) => {
      const { InputFile } = await import("grammy");
      const target = chatId < 0 ? config.tgStorageChat : chatId;
      if (!target) throw new Error("\u041D\u0435\u043A\u0443\u0434\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0444\u043E\u0442\u043E: \u0437\u0430\u0434\u0430\u0439\u0442\u0435 TG_STORAGE_CHAT_ID");
      const msg = await a.sendPhoto(target, new InputFile(photo2), { caption });
      const sizes = msg.photo ?? [];
      return { file_id: sizes[sizes.length - 1].file_id };
    },
    sendDocument: async (chatId, file, filename, caption) => {
      const { InputFile } = await import("grammy");
      const target = chatId < 0 ? config.tgStorageChat : chatId;
      if (!target) throw new Error("\u041D\u0435\u043A\u0443\u0434\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0444\u043E\u0442\u043E: \u0437\u0430\u0434\u0430\u0439\u0442\u0435 TG_STORAGE_CHAT_ID");
      const msg = await a.sendDocument(target, new InputFile(file, filename), { caption });
      return { file_id: msg.document.file_id };
    },
    setChatMenuButton: async (chatId, text, url) => {
      if (chatId < 0) return null;
      return a.setChatMenuButton({ chat_id: chatId, menu_button: { type: "web_app", text, web_app: { url } } });
    }
  };
}
function isBlockedError(e) {
  const err = e;
  return err?.error_code === 403 || /blocked|chat not found|deactivated|chat\.denied|dialog|not\.found/i.test(err?.description ?? "");
}
var override2, api;
var init_telegram = __esm({
  "server/telegram.ts"() {
    "use strict";
    init_config();
    override2 = null;
    api = null;
  }
});

// server/notify.ts
var notify_exports = {};
__export(notify_exports, {
  broadcast: () => broadcast,
  notifySuperadmins: () => notifySuperadmins,
  onBookingCancelled: () => onBookingCancelled,
  onBookingCreated: () => onBookingCreated,
  sendLinkOffers: () => sendLinkOffers,
  sendReminder: () => sendReminder,
  sendTo: () => sendTo
});
async function safeSend(chatId, html, extra) {
  if (Number(chatId) < 0 && !config.maxBotToken) return false;
  try {
    await tg().sendMessage(chatId, html, extra);
    return true;
  } catch (e) {
    if (!isBlockedError(e)) console.error("sendMessage", chatId, e);
    return false;
  }
}
async function toClient(db2, clientId, html, extra) {
  const ids = await personIds(db2, Number(clientId)).catch(() => [Number(clientId)]);
  const origin = platformName(Number(clientId));
  await Promise.all(
    ids.map((id) => safeSend(id, platformName(id) === origin ? html : `${html}

<i>\u0417\u0430\u043F\u0438\u0441\u044C \u0441\u0434\u0435\u043B\u0430\u043D\u0430 \u0447\u0435\u0440\u0435\u0437 ${origin}.</i>`, extra))
  );
}
async function sendLinkOffers(offers) {
  for (const o of offers) {
    const inline_keyboard = o.kb.map((row2) => row2.map((b) => ({ text: b.text, callback_data: b.cb ?? "" })));
    await safeSend(o.toId, o.html, { reply_markup: { inline_keyboard } });
  }
}
async function adminRecipients(db2, businessId, staffId) {
  const rows = await db2.query(
    `select tg_id from business_admins where business_id = $1
     union select tg_id from staff where id = $2 and tg_id is not null`,
    [businessId, staffId ?? 0]
  );
  return rows.map((r) => Number(r.tg_id));
}
function bookingCard(b, biz, staffName2) {
  const lines = [
    `<b>${esc(fmtWhen(b.starts_at, biz.timezone))}</b>`,
    `${esc(b.service_title)}${b.price ? ` \u2014 ${rub(b.price)}` : ""}`,
    staffName2 && biz.settings.chooseStaff ? row(biz.settings.labels.staff, esc(staffName2)) : "",
    ...biz.settings.fields.filter((f) => b.answers?.[f.key]).map((f) => row(f.label, esc(b.answers[f.key])))
  ].filter(Boolean);
  return `<blockquote>${lines.join("\n")}</blockquote>`;
}
async function onBookingCreated(db2, biz, b) {
  const sName = await staffName(db2, b.staff_id);
  const adminText = join([
    `<b>\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C</b> \xB7 ${esc(biz.name)}`,
    bookingCard(b, biz, sName),
    row("\u041A\u043B\u0438\u0435\u043D\u0442", `<b>${esc(b.client_name)}</b>`),
    b.client_phone && row("\u0422\u0435\u043B\u0435\u0444\u043E\u043D", phoneHtml(b.client_phone)),
    b.comment && row("\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", esc(b.comment)),
    GAP,
    b.client_tg_id < 0 ? "<i>\u041A\u043B\u0438\u0435\u043D\u0442 \u0437\u0430\u043F\u0438\u0441\u0430\u043B\u0441\u044F \u0447\u0435\u0440\u0435\u0437 MAX</i>" : `<a href="tg://user?id=${b.client_tg_id}">\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043A\u043B\u0438\u0435\u043D\u0442\u0443 \u0432 Telegram</a>`
  ]);
  const adminKb = webAppButton("\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u0438", webAppUrl({ b: biz.slug, view: "admin" }));
  await Promise.all((await adminRecipients(db2, biz.id, b.staff_id)).map((id) => safeSend(id, adminText, adminKb)));
  const clientText = join([
    `<b>\u0412\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u044B</b> \xB7 ${esc(biz.name)}`,
    bookingCard(b, biz, sName),
    biz.settings.address && row("\u0410\u0434\u0440\u0435\u0441", esc(biz.settings.address)),
    biz.settings.contactPhone && row("\u0422\u0435\u043B\u0435\u0444\u043E\u043D", phoneHtml(biz.settings.contactPhone)),
    biz.settings.afterBookingText && GAP,
    biz.settings.afterBookingText && `<i>${esc(biz.settings.afterBookingText)}</i>`
  ]);
  await toClient(db2, b.client_tg_id, clientText + await otherMessengerHint(db2, b.client_tg_id, biz.slug), webAppButton("\u041C\u043E\u0438 \u0437\u0430\u043F\u0438\u0441\u0438", webAppUrl({ b: biz.slug, view: "my" })));
}
async function otherMessengerHint(db2, clientId, slug) {
  try {
    const ids = await personIds(db2, Number(clientId));
    const fromMax = Number(clientId) < 0;
    if (ids.some((id) => id < 0 !== fromMax)) return "";
    if (fromMax && config.botUsername) {
      return `

<a href="https://t.me/${config.botUsername}?start=${slug}">\u041F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u0438 \u0432 Telegram</a>`;
    }
    if (!fromMax && config.maxBotToken && config.maxBotName) {
      return `

<a href="https://max.ru/${config.maxBotName}?start=${slug}">\u041F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u0438 \u0432 MAX</a>`;
    }
  } catch {
  }
  return "";
}
async function onBookingCancelled(db2, biz, b) {
  const sName = await staffName(db2, b.staff_id);
  if (b.cancelled_by === "client") {
    const text = join([
      `<b>\u041A\u043B\u0438\u0435\u043D\u0442 \u043E\u0442\u043C\u0435\u043D\u0438\u043B \u0437\u0430\u043F\u0438\u0441\u044C</b> \xB7 ${esc(biz.name)}`,
      `<blockquote><s>${esc(fmtWhen(b.starts_at, biz.timezone))}</s>
${esc(b.service_title)}</blockquote>`,
      row("\u041A\u043B\u0438\u0435\u043D\u0442", `<b>${esc(b.client_name)}</b>`),
      b.client_phone && row("\u0422\u0435\u043B\u0435\u0444\u043E\u043D", phoneHtml(b.client_phone)),
      GAP,
      "<i>\u042D\u0442\u043E \u0432\u0440\u0435\u043C\u044F \u0441\u043D\u043E\u0432\u0430 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E \u0434\u043B\u044F \u0437\u0430\u043F\u0438\u0441\u0438.</i>"
    ]);
    await Promise.all((await adminRecipients(db2, biz.id, b.staff_id)).map((id) => safeSend(id, text)));
  } else {
    const text = join([
      `<b>\u0417\u0430\u043F\u0438\u0441\u044C \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430</b> \xB7 ${esc(biz.name)}`,
      `<blockquote><s>${esc(fmtWhen(b.starts_at, biz.timezone))}</s>
${esc(b.service_title)}</blockquote>`,
      "\u0418\u0437\u0432\u0438\u043D\u0438\u0442\u0435 \u0437\u0430 \u043D\u0435\u0443\u0434\u043E\u0431\u0441\u0442\u0432\u043E. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435, \u043F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0434\u0440\u0443\u0433\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u2014 \u0431\u0443\u0434\u0435\u043C \u0440\u0430\u0434\u044B \u0432\u0430\u0441 \u0432\u0438\u0434\u0435\u0442\u044C."
    ]);
    await toClient(db2, b.client_tg_id, text, webAppButton("\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u0441\u043D\u043E\u0432\u0430", webAppUrl({ b: biz.slug })));
  }
}
async function sendReminder(biz, b, kind, now = /* @__PURE__ */ new Date()) {
  const when = `${relDay(b.starts_at, biz.timezone, now)} \u0432 ${fmtTime(b.starts_at, biz.timezone)}`;
  const text = join([
    kind === "2h" ? `<b>\u0421\u043A\u043E\u0440\u043E \u0432\u0438\u0437\u0438\u0442 \u2014 ${esc(when)}</b>` : `<b>\u041D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u0435\u043C \u043E \u0437\u0430\u043F\u0438\u0441\u0438 \u2014 ${esc(when)}</b>`,
    `<blockquote>${esc(biz.name)}
${esc(b.service_title)}</blockquote>`,
    biz.settings.address && row("\u0410\u0434\u0440\u0435\u0441", esc(biz.settings.address)),
    GAP,
    kind === "24h" ? "<i>\u0415\u0441\u043B\u0438 \u043F\u043B\u0430\u043D\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C \u2014 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C, \u0447\u0442\u043E\u0431\u044B \u0432\u0440\u0435\u043C\u044F \u0434\u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0434\u0440\u0443\u0433\u043E\u043C\u0443.</i>" : "\u0414\u043E \u0432\u0441\u0442\u0440\u0435\u0447\u0438!"
  ]);
  await toClient(db(), b.client_tg_id, text, webAppButton("\u041C\u043E\u0438 \u0437\u0430\u043F\u0438\u0441\u0438", webAppUrl({ b: biz.slug, view: "my" })));
  return true;
}
async function notifySuperadmins(html) {
  await Promise.all(config.superadmins.map((id) => safeSend(id, html)));
}
async function broadcast(db2, biz, text) {
  const clients = await db2.query(
    `select tg_id from clients where business_id = $1 and not blocked_bot order by last_seen desc limit 2000`,
    [biz.id]
  );
  const html = `<b>${esc(biz.name)}</b>

${esc(text)}`;
  const kb = webAppButton("\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F", webAppUrl({ b: biz.slug }));
  let sent = 0;
  let failed = 0;
  const blocked = [];
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
    await db2.query(`update clients set blocked_bot = true where business_id = $1 and tg_id = any($2::bigint[])`, [
      biz.id,
      blocked
    ]);
  }
  return { sent, failed };
}
var webAppButton, sendTo, row, phoneHtml, staffName, GAP, join;
var init_notify = __esm({
  "server/notify.ts"() {
    "use strict";
    init_db();
    init_links();
    init_config();
    init_format();
    init_telegram();
    webAppButton = (text, url) => ({ reply_markup: { inline_keyboard: [[{ text, web_app: { url } }]] } });
    sendTo = (id, html) => safeSend(id, html);
    row = (label, value) => `<i>${esc(label)}:</i> ${value}`;
    phoneHtml = (p) => `<code>${esc(p)}</code>`;
    staffName = async (db2, id) => (await db2.query(`select name from staff where id = $1`, [id]))[0]?.name;
    GAP = "\0";
    join = (parts) => parts.filter((x) => typeof x === "string" && x !== "").map((x) => x === GAP ? "" : x).join("\n");
  }
});

// server/flows.ts
async function businessCard(uid, b) {
  const s = b.settings;
  const kb = [[{ text: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043E\u043D\u043B\u0430\u0439\u043D", app: { b: b.slug } }], [{ text: "\u041C\u043E\u0438 \u0437\u0430\u043F\u0438\u0441\u0438", app: { b: b.slug, view: "my" } }]];
  const others = (await businessesOfClient(db(), uid)).filter((x) => x.id !== b.id);
  if (others.length) kb.push([{ text: "\u0414\u0440\u0443\u0433\u0438\u0435 \u043C\u0430\u0441\u0442\u0435\u0440\u0430", cb: "masters" }]);
  if (isSuper(uid)) kb.push([{ text: "\u041F\u0430\u043D\u0435\u043B\u044C \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B", app: { view: "super" } }]);
  const lines = [`<b>${esc(b.name)}</b>`, "", esc(s.welcome)];
  const info = [s.address && `<i>\u0410\u0434\u0440\u0435\u0441:</i> ${esc(s.address)}`, s.contactPhone && `<i>\u0422\u0435\u043B\u0435\u0444\u043E\u043D:</i> <code>${esc(s.contactPhone)}</code>`].filter(Boolean);
  if (info.length) lines.push("", ...info);
  return { html: lines.join("\n"), kb, menuSlug: b.slug };
}
async function platformMenu(uid) {
  const adminOf = await businessesOfAdmin(db(), uid);
  const kb = adminOf.slice(0, 5).map((b) => [{ text: `\u041F\u0430\u043D\u0435\u043B\u044C: ${b.name}`, app: { b: b.slug, view: "admin" } }]);
  if (isSuper(uid)) kb.push([{ text: "\u041F\u0430\u043D\u0435\u043B\u044C \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B", app: { view: "super" } }]);
  if (adminOf.length || isSuper(uid)) return { html: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435, \u0447\u0442\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u044C:", kb };
  return { html: ["<b>\u041E\u043D\u043B\u0430\u0439\u043D-\u0437\u0430\u043F\u0438\u0441\u044C</b>", "", "\u0427\u0442\u043E\u0431\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F, \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0432\u0430\u0448\u0435\u0433\u043E \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u2014 \u0438 \u0437\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0437\u0430\u043F\u0438\u0441\u044C \u043A \u043D\u0435\u043C\u0443."].join("\n") };
}
async function mastersList(uid) {
  const list = await businessesOfClient(db(), uid);
  if (!list.length) return { html: "\u0417\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043C\u0430\u0441\u0442\u0435\u0440\u0430, \u043A \u043A\u043E\u0442\u043E\u0440\u044B\u043C \u0432\u044B \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u043B\u0438\u0441\u044C. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u043C\u0430\u0441\u0442\u0435\u0440\u0430, \u0447\u0442\u043E\u0431\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F." };
  return {
    html: "<b>\u0412\u0430\u0448\u0438 \u043C\u0430\u0441\u0442\u0435\u0440\u0430</b>\n<i>\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435, \u043A \u043A\u043E\u043C\u0443 \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u0438\u043B\u0438 \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u0438.</i>",
    kb: list.map((b) => [{ text: b.name, app: { b: b.slug } }])
  };
}
async function onStart(user, payloadRaw, platform) {
  const replies = await startReplies(user, payloadRaw, platform);
  if (replies.some((r) => r.menuSlug || r.html.startsWith("<b>\u0412\u0430\u0448\u0438 \u043C\u0430\u0441\u0442\u0435\u0440\u0430</b>"))) {
    const ask = await contactAsk(user.id, platform).catch(() => null);
    if (ask) replies.push(ask);
  }
  return replies;
}
async function startReplies(user, payloadRaw, platform) {
  const payload = payloadRaw.trim();
  const uid = user.id;
  if (payload.startsWith("inv_")) {
    try {
      const { business, role } = await claimInvite(db(), payload.slice(4), uid);
      await setLastBusiness(db(), uid, business.id);
      const client = platform === "tg" ? clientLink(business.slug) : maxClientLink(business.slug);
      const admin = platform === "tg" ? adminLink(business.slug) : maxAdminLink(business.slug);
      if (role === "owner") {
        const { notifySuperadmins: notifySuperadmins2 } = await Promise.resolve().then(() => (init_notify(), notify_exports));
        await notifySuperadmins2(`<b>\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u043F\u0440\u0438\u043D\u044F\u0442\u043E:</b> \xAB${esc(business.name)}\xBB \u2192 ${nameLink(user, platform)}`);
      }
      return [
        {
          html: [
            `<b>\u0413\u043E\u0442\u043E\u0432\u043E.</b> \u0412\u044B ${role === "owner" ? "\u0432\u043B\u0430\u0434\u0435\u043B\u0435\u0446" : "\u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440"} \xAB${esc(business.name)}\xBB.`,
            "",
            "\u0412 \u043F\u0430\u043D\u0435\u043B\u0438 \u043C\u043E\u0436\u043D\u043E \u043F\u043E\u043C\u0435\u043D\u044F\u0442\u044C \u0443\u0441\u043B\u0443\u0433\u0438, \u0446\u0435\u043D\u044B, \u0433\u0440\u0430\u0444\u0438\u043A \u0438 \u0442\u0435\u043A\u0441\u0442\u044B.",
            "",
            "<b>\u0421\u0441\u044B\u043B\u043A\u0430 \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u0432</b>",
            "<i>\u041F\u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0435\u0451 \u0432 \u0448\u0430\u043F\u043A\u0443 \u043A\u0430\u043D\u0430\u043B\u0430, Instagram \u0438 \u0432 \u043E\u0442\u0432\u0435\u0442\u044B \u043A\u043B\u0438\u0435\u043D\u0442\u0430\u043C:</i>",
            `<code>${esc(client)}</code>`,
            "",
            "<b>\u0412\u0430\u0448\u0430 \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u043F\u0430\u043D\u0435\u043B\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F</b>",
            "<i>\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u0435\u0451. \u0423 \u0434\u0440\u0443\u0433\u0438\u0445 \u043B\u044E\u0434\u0435\u0439 \u043E\u043D\u0430 \u043E\u0442\u043A\u0440\u043E\u0435\u0442 \u043E\u0431\u044B\u0447\u043D\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C.</i>",
            `<code>${esc(admin)}</code>`
          ].join("\n"),
          kb: [[{ text: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F", app: { b: business.slug, view: "admin" } }]]
        }
      ];
    } catch (e) {
      return [{ html: e instanceof UserError ? esc(e.message) : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u0438\u043D\u044F\u0442\u044C \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435" }];
    }
  }
  if (payload.startsWith("adm_")) {
    const business = await getBusiness(db(), payload.slice(4));
    if (!business) return [await platformMenu(uid)];
    const role = await roleFor(db(), uid, business.id, config.superadmins);
    await setLastBusiness(db(), uid, business.id);
    if (!role) {
      await touchClient(db(), business.id, user);
      return [await businessCard(uid, business)];
    }
    return [
      {
        html: `<b>\u041F\u0430\u043D\u0435\u043B\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F</b> \xB7 ${esc(business.name)}`,
        kb: [[{ text: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F", app: { b: business.slug, view: "admin" } }], [{ text: "\u041A\u0430\u043A \u0432\u0438\u0434\u044F\u0442 \u043A\u043B\u0438\u0435\u043D\u0442\u044B", app: { b: business.slug } }]]
      }
    ];
  }
  if (payload) {
    const business = await getBusiness(db(), payload);
    if (business && business.status === "active") {
      await setLastBusiness(db(), uid, business.id);
      const role = await roleFor(db(), uid, business.id, config.superadmins);
      if (!role) await touchClient(db(), business.id, user);
      return [await businessCard(uid, business)];
    }
    if (business) return [{ html: "\u0417\u0430\u043F\u0438\u0441\u044C \u0432 \u044D\u0442\u043E\u0442 \u0431\u0438\u0437\u043D\u0435\u0441 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430." }];
  }
  if (!payload && !isSuper(uid)) {
    const mine = await businessesOfClient(db(), uid, 2);
    if (mine.length > 1) return [await mastersList(uid)];
  }
  const [u] = await db().query(`select last_business_id from users where tg_id = $1`, [uid]);
  if (u?.last_business_id && !payload) {
    const business = await getBusiness(db(), Number(u.last_business_id));
    if (business?.status === "active") return [await businessCard(uid, business)];
  }
  return [await platformMenu(uid)];
}
async function onOtherMessage(uid) {
  const [u] = await db().query(`select last_business_id from users where tg_id = $1`, [uid]);
  const business = u?.last_business_id ? await getBusiness(db(), Number(u.last_business_id)) : null;
  if (!business) return platformMenu(uid);
  const s = business.settings;
  const contacts = [s.contactPhone && `<i>\u0422\u0435\u043B\u0435\u0444\u043E\u043D:</i> <code>${esc(s.contactPhone)}</code>`, ...s.links.map((l) => `<a href="${esc(l.url)}">${esc(l.title)}</a>`)].filter(Boolean).join("\n");
  return {
    html: `\u042F \u0431\u043E\u0442 \u043E\u043D\u043B\u0430\u0439\u043D-\u0437\u0430\u043F\u0438\u0441\u0438 \xAB${esc(business.name)}\xBB \u0438 \u043D\u0435 \u0447\u0438\u0442\u0430\u044E \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0443.${contacts ? `

<b>\u0421\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E</b>
${contacts}` : ""}`,
    kb: [[{ text: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F", app: { b: business.slug } }]]
  };
}
async function contactAsk(uid, platform) {
  const [u] = await db().query(`select phone from users where tg_id = $1`, [uid]);
  if (u?.phone) return null;
  const other = platform === "tg" ? "MAX" : "Telegram";
  return {
    html: `\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u0435\u0441\u044C \u043D\u043E\u043C\u0435\u0440\u043E\u043C \u2014 \u0435\u0441\u043B\u0438 \u0432\u044B \u0443\u0436\u0435 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u043B\u0438\u0441\u044C \u0447\u0435\u0440\u0435\u0437 ${other}, \u0432\u0430\u0448\u0438 \u0437\u0430\u043F\u0438\u0441\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0438 \u0437\u0434\u0435\u0441\u044C, \u0430 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u0431\u0443\u0434\u0443\u0442 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442\u044C \u0432 \u043E\u0431\u0430 \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u0430.`,
    askContact: true,
    kb: [[{ text: "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u043D\u043E\u043C\u0435\u0440\u043E\u043C", contact: true }]]
  };
}
async function upcomingSummary(uid) {
  const rows = await db().query(
    `select b.starts_at, b.service_title, z.name, z.timezone from bookings b join businesses z on z.id = b.business_id
     where b.client_tg_id in ${samePerson(1)} and b.status = 'confirmed' and b.starts_at > now()
     order by b.starts_at limit 5`,
    [uid]
  );
  const { fmtWhen: fmtWhen2 } = await Promise.resolve().then(() => (init_format(), format_exports));
  return rows.map((r) => `\u2022 <b>${esc(fmtWhen2(r.starts_at, r.timezone))}</b> \u2014 ${esc(r.service_title)}, \xAB${esc(r.name)}\xBB`);
}
async function onContact(uid, rawPhone) {
  const pc = checkPhone(rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`);
  if (!pc.ok) return null;
  const [u] = await db().query(`select last_business_id from users where tg_id = $1`, [uid]);
  if (u?.last_business_id) {
    await db().query(`update clients set phone = $3 where business_id = $1 and tg_id = $2`, [u.last_business_id, uid, pc.phone]);
  }
  let linked = false;
  try {
    const { rememberPhone: rememberPhone2, autoLink: autoLink2 } = await Promise.resolve().then(() => (init_links(), links_exports));
    const { sendLinkOffers: sendLinkOffers2 } = await Promise.resolve().then(() => (init_notify(), notify_exports));
    await rememberPhone2(db(), uid, pc.phone, true);
    const notices = await autoLink2(db(), uid, pc.phone);
    linked = notices.length > 0;
    await sendLinkOffers2(notices);
  } catch (e) {
    console.error("link on contact", e);
  }
  const slug = u?.last_business_id ? (await getBusiness(db(), Number(u.last_business_id)))?.slug : void 0;
  const kb = slug ? [[{ text: "\u041C\u043E\u0438 \u0437\u0430\u043F\u0438\u0441\u0438", app: { b: slug, view: "my" } }]] : [];
  if (!linked) return { html: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E, \u043D\u043E\u043C\u0435\u0440 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D.", kb, removeKeyboard: true };
  const list = await upcomingSummary(uid);
  return {
    html: [
      "<b>\u041D\u0430\u0448\u043B\u0438 \u0432\u0430\u0448 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0432 \u0434\u0440\u0443\u0433\u043E\u043C \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u0435.</b>",
      list.length ? "\u0412\u0430\u0448\u0438 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0438:" : "\u0417\u0430\u043F\u0438\u0441\u0438 \u0438 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u0442\u0435\u043F\u0435\u0440\u044C \u0431\u0443\u0434\u0443\u0442 \u0437\u0434\u0435\u0441\u044C \u0438 \u0442\u0430\u043C.",
      ...list,
      "",
      "<i>\u0417\u0430\u043F\u0438\u0441\u0438 \u0432\u0438\u0434\u043D\u044B \u0432 \u043E\u0431\u043E\u0438\u0445 \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u0430\u0445, \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F \u043F\u0440\u0438\u0434\u0443\u0442 \u0432 \u043E\u0431\u0430.</i>"
    ].join("\n"),
    kb,
    removeKeyboard: true
  };
}
async function onLinkAnswer(uid, requestId, yes) {
  const { answerLink: answerLink2 } = await Promise.resolve().then(() => (init_links(), links_exports));
  const res = await answerLink2(db(), requestId, uid, yes);
  return { html: res ? res.html : "\u042D\u0442\u0430 \u043A\u043D\u043E\u043F\u043A\u0430 \u043D\u0435 \u0434\u043B\u044F \u0432\u0430\u0441." };
}
var isSuper, nameLink, helpReply;
var init_flows = __esm({
  "server/flows.ts"() {
    "use strict";
    init_config();
    init_db();
    init_format();
    init_phone();
    init_store();
    init_store();
    isSuper = (id) => config.superadmins.includes(id);
    nameLink = (u, platform) => platform === "tg" ? `<a href="tg://user?id=${u.id}">${esc(u.first_name)}</a>` : `${esc(u.first_name)} (MAX)`;
    helpReply = (platform) => ({
      html: `\u0417\u0430\u043F\u0438\u0441\u044C, \u043E\u0442\u043C\u0435\u043D\u0430 \u0438 \u043F\u0435\u0440\u0435\u043D\u043E\u0441 \u2014 \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438 (\u043A\u043D\u043E\u043F\u043A\u0430 \xAB\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F\xBB).
/start \u2014 \u0433\u043B\u0430\u0432\u043D\u043E\u0435 \u043C\u0435\u043D\u044E
/masters \u2014 \u043C\u043E\u0438 \u043C\u0430\u0441\u0442\u0435\u0440\u0430
/admin \u2014 \u043F\u0430\u043D\u0435\u043B\u044C \u0434\u043B\u044F \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0435\u0432 \u0431\u0438\u0437\u043D\u0435\u0441\u0430` + (platform === "max" ? "\n/id \u2014 \u0432\u0430\u0448 id \u0432 MAX" : "")
    });
  }
});

// server/maxbot.ts
var maxbot_exports = {};
__export(maxbot_exports, {
  handleMaxUpdate: () => handleMaxUpdate,
  maxUserToTg: () => maxUserToTg
});
async function reply(uid, replies) {
  for (const r of Array.isArray(replies) ? replies : [replies]) await maxSend(uid, r.html, r.kb ?? []);
}
async function handleMaxUpdate(update) {
  const type = update?.update_type ?? "";
  if (type === "bot_started") {
    const user = maxUserToTg(update.user);
    await upsertUser(db(), user);
    await reply(user.id, await onStart(user, String(update.payload ?? ""), "max"));
    return;
  }
  if (type === "message_callback") {
    const cb = update.callback ?? {};
    const user = maxUserToTg(cb.user);
    await upsertUser(db(), user);
    await maxAnswerCallback(String(cb.callback_id ?? ""));
    if (cb.payload === "masters") await reply(user.id, await mastersList(user.id));
    const lnk = /^lnk:(\d+):([yn])$/.exec(String(cb.payload ?? ""));
    if (lnk) await reply(user.id, await onLinkAnswer(user.id, Number(lnk[1]), lnk[2] === "y"));
    return;
  }
  if (type === "message_created") {
    const msg = update.message ?? {};
    if (!msg.sender || msg.sender.is_bot || msg.recipient?.chat_type && msg.recipient.chat_type !== "dialog") return;
    const user = maxUserToTg(msg.sender);
    await upsertUser(db(), user);
    const text = String(msg.body?.text ?? "").trim();
    const contact = (msg.body?.attachments ?? []).find((a) => a?.type === "contact");
    if (contact) {
      const own = contact.payload?.max_info?.user_id;
      if (own != null && Number(own) !== Number(msg.sender.user_id)) return;
      const vcf = contact.payload?.vcf_info ?? "";
      const phone = vcf.match(/TEL[^:]*:([+\d\s()-]+)/i)?.[1]?.replace(/[^\d+]/g, "");
      const r = phone ? await onContact(user.id, phone) : null;
      if (r) await reply(user.id, r);
      return;
    }
    const [cmd, ...rest] = text.split(/\s+/);
    switch (cmd?.toLowerCase()) {
      case "/start":
        return reply(user.id, await onStart(user, rest.join(" "), "max"));
      case "/masters":
        return reply(user.id, await mastersList(user.id));
      case "/admin":
        return reply(user.id, await platformMenu(user.id));
      case "/help":
        return reply(user.id, helpReply("max"));
      case "/id":
        return reply(user.id, { html: `\u0412\u0430\u0448 id \u0432 MAX: <code>${-user.id}</code>
\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u0439 id \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0435: <code>${user.id}</code>` });
      default:
        return reply(user.id, await onOtherMessage(user.id));
    }
  }
}
var maxUserToTg;
var init_maxbot = __esm({
  "server/maxbot.ts"() {
    "use strict";
    init_db();
    init_flows();
    init_max();
    init_store();
    maxUserToTg = (u) => ({
      id: fromMaxUserId(u.user_id),
      first_name: u.first_name || u.username || "\u0413\u043E\u0441\u0442\u044C",
      last_name: u.last_name || void 0,
      username: u.username || void 0
    });
  }
});

// server/handler.ts
import { webhookCallback } from "grammy";

// server/auth.ts
import { createHmac, timingSafeEqual } from "node:crypto";
var AuthError = class extends Error {
};
var MAX_AGE_SEC = 7 * 24 * 3600;
function verifyContactProof(raw, botToken, userId, nowMs = Date.now()) {
  try {
    if (!raw || !botToken) return null;
    const params = new URLSearchParams(raw);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const dataCheck = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
    const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
    const expected = createHmac("sha256", secret).update(dataCheck).digest();
    const given = Buffer.from(hash, "hex");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const authDate = Number(params.get("auth_date"));
    if (!authDate || nowMs / 1e3 - authDate > 24 * 3600) return null;
    const contact = JSON.parse(params.get("contact") ?? "null");
    if (!contact?.phone_number || Number(contact.user_id) !== userId) return null;
    return String(contact.phone_number);
  } catch {
    return null;
  }
}
function verifyInitData(raw, botToken, nowMs = Date.now()) {
  if (!raw) throw new AuthError("\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438");
  const params = new URLSearchParams(raw);
  const hash = params.get("hash");
  if (!hash) throw new AuthError("\u041D\u0435\u0442 \u043F\u043E\u0434\u043F\u0438\u0441\u0438");
  params.delete("hash");
  const dataCheck = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheck).digest();
  const given = Buffer.from(hash, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new AuthError("\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u044C");
  }
  const authDate = Number(params.get("auth_date"));
  if (!authDate || nowMs / 1e3 - authDate > MAX_AGE_SEC) throw new AuthError("\u0421\u0435\u0441\u0441\u0438\u044F \u0443\u0441\u0442\u0430\u0440\u0435\u043B\u0430, \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0437\u0430\u043D\u043E\u0432\u043E");
  const userRaw = params.get("user");
  if (!userRaw) throw new AuthError("\u041D\u0435\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F");
  const user = JSON.parse(userRaw);
  return { user, startParam: params.get("start_param") ?? void 0, authDate };
}

// server/bot.ts
init_config();
init_db();
init_flows();
init_store();
import { Bot, InlineKeyboard } from "grammy";
var bot = null;
function getBot() {
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
    has_main_web_app: Boolean(config.botAppName)
  };
  bot = new Bot(config.botToken, { botInfo });
  register(bot);
  return bot;
}
function tgKeyboard(rows) {
  if (!rows?.length) return void 0;
  const kb = new InlineKeyboard();
  rows.forEach((row2, i) => {
    if (i) kb.row();
    for (const b of row2) {
      if (b.contact) continue;
      if (b.app) kb.webApp(b.text, webAppUrl(b.app));
      else if (b.url) kb.url(b.text, b.url);
      else kb.text(b.text, b.cb ?? "");
    }
  });
  return kb;
}
async function send(ctx, replies) {
  for (const r of Array.isArray(replies) ? replies : [replies]) {
    const reply_markup = r.askContact ? { keyboard: [[{ text: "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u043D\u043E\u043C\u0435\u0440\u043E\u043C", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } : r.removeKeyboard ? { remove_keyboard: true } : tgKeyboard(r.kb);
    await ctx.reply(r.html, { parse_mode: "HTML", reply_markup, link_preview_options: { is_disabled: true } });
    if (r.menuSlug) {
      await ctx.api.setChatMenuButton({ chat_id: ctx.chat.id, menu_button: { type: "web_app", text: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F", web_app: { url: webAppUrl({ b: r.menuSlug }) } } }).catch(() => {
      });
    }
  }
}
function register(b) {
  b.use(async (ctx, next) => {
    if (ctx.from && !ctx.from.is_bot) await upsertUser(db(), ctx.from);
    await next();
  });
  b.command("start", async (ctx) => send(ctx, await onStart(ctx.from, String(ctx.match ?? ""), "tg")));
  b.command("admin", async (ctx) => send(ctx, await platformMenu(ctx.from.id)));
  b.command("masters", async (ctx) => send(ctx, await mastersList(ctx.from.id)));
  b.callbackQuery("masters", async (ctx) => {
    await ctx.answerCallbackQuery();
    await send(ctx, await mastersList(ctx.from.id));
  });
  b.command("help", (ctx) => send(ctx, helpReply("tg")));
  b.callbackQuery(/^lnk:(\d+):([yn])$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: void 0 }).catch(() => {
    });
    await send(ctx, await onLinkAnswer(ctx.from.id, Number(ctx.match[1]), ctx.match[2] === "y"));
  });
  b.on("message:contact", async (ctx) => {
    const c = ctx.message.contact;
    if (c.user_id !== ctx.from.id) return;
    const r = await onContact(ctx.from.id, c.phone_number);
    if (r) await send(ctx, r);
  });
  b.on("message", async (ctx) => send(ctx, await onOtherMessage(ctx.from.id)));
  b.on("my_chat_member", async (ctx) => {
    if (ctx.myChatMember.new_chat_member.status === "kicked") {
      await db().query(`update clients set blocked_bot = true where tg_id = $1`, [ctx.from.id]);
    }
  });
  b.catch((err) => console.error("bot error", err.error));
}

// server/handler.ts
init_config();
init_db();

// server/cron.ts
init_db();
init_notify();
init_store();
import { DateTime as DateTime4 } from "luxon";
async function runReminders(now = /* @__PURE__ */ new Date()) {
  const rows = await db().query(
    `select b.*, z.timezone as tz from bookings b join businesses z on z.id = b.business_id
     where b.status = 'confirmed' and z.status = 'active'
       and b.starts_at > $1 and b.starts_at < $1::timestamptz + interval '48 hours'
       and (not b.reminded_24h or not b.reminded_2h)
     order by b.starts_at limit 1000`,
    [now.toISOString()]
  );
  const cache = /* @__PURE__ */ new Map();
  let sent = 0;
  for (const b of rows) {
    if (!cache.has(b.business_id)) cache.set(b.business_id, await getBusiness(db(), b.business_id));
    const biz = cache.get(b.business_id);
    if (!biz) continue;
    const msLeft = new Date(b.starts_at).getTime() - now.getTime();
    const tomorrow = DateTime4.fromJSDate(now).setZone(biz.timezone).plus({ days: 1 }).toISODate();
    const isTomorrow = DateTime4.fromJSDate(new Date(b.starts_at)).setZone(biz.timezone).toISODate() === tomorrow;
    const createdRecently = now.getTime() - new Date(b.created_at).getTime() < 30 * 6e4;
    if (!b.reminded_2h && biz.settings.remind2h && msLeft <= 2 * 36e5) {
      if (!createdRecently) {
        await sendReminder(biz, b, "2h", now);
        sent++;
      }
      await db().query(`update bookings set reminded_2h = true, reminded_24h = true where id = $1`, [b.id]);
    } else if (!b.reminded_24h && (msLeft <= 24 * 36e5 || isTomorrow)) {
      if (!createdRecently) {
        await sendReminder(biz, b, "24h", now);
        sent++;
      }
      await db().query(`update bookings set reminded_24h = true where id = $1`, [b.id]);
    }
  }
  await db().query(
    `update bookings set status = 'done' where status = 'confirmed' and ends_at < $1::timestamptz - interval '12 hours'`,
    [now.toISOString()]
  );
  return { checked: rows.length, sent };
}

// server/rpc.ts
import { DateTime as DateTime5 } from "luxon";
init_phone();
init_config();
init_db();
init_links();
init_notify();
init_slots();
init_store();
init_store();
init_telegram();
init_templates();
var int = (v, name) => {
  const n = Number(v);
  if (!Number.isInteger(n)) throw new UserError(`\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0435 \u043F\u043E\u043B\u0435 ${name}`);
  return n;
};
var str = (v, max = 500) => String(v ?? "").trim().slice(0, max);
function publicBusiness(b) {
  return { id: b.id, slug: b.slug, name: b.name, template: b.template, status: b.status, timezone: b.timezone, settings: b.settings };
}
var maxOn = () => Boolean(config.maxBotToken && config.maxBotName);
function links(b) {
  return {
    client: clientLink(b.slug),
    admin: adminLink(b.slug),
    botStart: `https://t.me/${config.botUsername}?start=${b.slug}`,
    // те же ссылки для MAX — когда бот MAX подключён
    ...maxOn() ? { maxClient: maxClientLink(b.slug), maxAdmin: maxAdminLink(b.slug) } : {}
  };
}
async function catalog(b) {
  const [services, staff, portfolio, albums] = await Promise.all([
    listServices(db(), b.id),
    listStaff(db(), b.id),
    listPortfolio(db(), b.id),
    listAlbums(db(), b.id)
  ]);
  return {
    services: services.map(({ id, title, description, price, price_from, duration_min }) => ({
      id,
      title,
      description,
      price,
      price_from,
      duration_min
    })),
    // photo — метка версии фото мастера (меняется при замене, чтобы не показывать старое из кэша)
    staff: staff.map(({ id, name, description, photo_file_id }) => ({ id, name, description, photo: photoTag(photo_file_id) })),
    portfolio: portfolio.map((p) => ({ id: p.id, caption: p.caption, staffId: p.staff_id == null ? null : Number(p.staff_id), albumId: p.album_id == null ? null : Number(p.album_id) })),
    albums: albums.map((a) => ({ id: Number(a.id), title: a.title, description: a.description, serviceId: a.service_id == null ? null : Number(a.service_id) }))
  };
}
async function boot(ctx, p) {
  const u = ctx.init.user;
  const me = await upsertUser(db(), u);
  const isSuper2 = config.superadmins.includes(u.id);
  const wanted = str(p.slug, 60) || ctx.init.startParam || void 0;
  let business = null;
  if (p.businessId) business = await getBusiness(db(), int(p.businessId, "businessId"));
  if (!business && wanted && !wanted.startsWith("inv_")) business = await getBusiness(db(), wanted);
  if (!business && me.last_business_id) business = await getBusiness(db(), Number(me.last_business_id));
  const adminOf = await businessesOfAdmin(db(), u.id);
  const role = business ? await roleFor(db(), u.id, business.id, config.superadmins) : null;
  if (business && business.status === "blocked" && !role) {
    return { me: { id: u.id, name: u.first_name, isSuper: isSuper2 }, business: null, blocked: true, adminOf: [], templates: tplList() };
  }
  if (business) {
    if (Number(me.last_business_id) !== business.id) {
      await setLastBusiness(db(), u.id, business.id);
      tg().setChatMenuButton(u.id, "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F", webAppUrl({ b: business.slug })).catch(() => {
      });
    }
    if (!role) await touchClient(db(), business.id, u);
  }
  const [client] = business ? await db().query(`select name, phone from clients where business_id = $1 and tg_id = $2`, [business.id, u.id]) : [];
  const [next] = business ? await db().query(
    `select starts_at, service_title from bookings where business_id = $1 and client_tg_id in ${samePerson(2)}
         and status = 'confirmed' and starts_at > now() order by starts_at limit 1`,
    [business.id, u.id]
  ) : [];
  const others = (await businessesOfClient(db(), u.id)).filter((b) => b.id !== business?.id).map((b) => ({ id: b.id, slug: b.slug, name: b.name, bannerFileId: b.settings.bannerFileId || "" }));
  return {
    me: { id: u.id, name: u.first_name, isSuper: isSuper2 },
    business: business ? { ...publicBusiness(business), ...await catalog(business) } : null,
    role,
    client: client ?? null,
    next: next ?? null,
    others,
    // ссылки «поделиться» для клиента: позвать подругу к этому же мастеру
    share: business ? { tg: clientLink(business.slug), max: config.maxBotToken && config.maxBotName ? maxClientLink(business.slug) : null } : null,
    adminOf: adminOf.map((b) => ({ id: b.id, slug: b.slug, name: b.name, role: b.role, emoji: b.settings.emoji })),
    templates: tplList()
  };
}
var tplList = () => TEMPLATES.map(({ id, title, emoji, pitch }) => ({ id, title, emoji, pitch }));
async function requireBusiness(id) {
  const b = await getBusiness(db(), int(id, "businessId"));
  if (!b) throw new UserError("\u0411\u0438\u0437\u043D\u0435\u0441 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
  return b;
}
async function availability2(ctx, p) {
  const b = await requireBusiness(p.businessId);
  return availability(db(), {
    business: b,
    serviceId: int(p.serviceId, "serviceId"),
    staffId: p.staffId ? int(p.staffId, "staffId") : null,
    days: Math.min(int(p.days ?? 14, "days"), 62),
    now: ctx.now
  });
}
async function book(ctx, p) {
  const b = await requireBusiness(p.businessId);
  const booking = await createBooking(db(), {
    business: b,
    serviceId: int(p.serviceId, "serviceId"),
    staffId: p.staffId ? int(p.staffId, "staffId") : null,
    start: str(p.start, 40),
    client: { tgId: ctx.init.user.id, name: str(p.name, 80), phone: str(p.phone, 30) },
    answers: typeof p.answers === "object" && p.answers ? p.answers : {},
    comment: str(p.comment),
    now: ctx.now
  });
  await onBookingCreated(db(), b, booking);
  if (booking.client_phone) {
    try {
      const proof = verifyContactProof(String(p.phoneProof ?? ""), config.botToken, ctx.init.user.id);
      const pc = proof ? checkPhone(proof.startsWith("+") ? proof : `+${proof}`) : null;
      const proofOk = !!pc && pc.ok && pc.phone === booking.client_phone;
      await rememberPhone(db(), ctx.init.user.id, booking.client_phone, proofOk);
      const offers = await autoLink(db(), ctx.init.user.id, booking.client_phone, {
        businessName: b.name,
        startsAt: String(booking.starts_at),
        timezone: b.timezone
      });
      await sendLinkOffers(offers);
    } catch (e) {
      console.error("link offers", e);
    }
  }
  return { id: booking.id, starts_at: booking.starts_at, staff_id: Number(booking.staff_id) };
}
async function myBookings(ctx, p) {
  const b = await requireBusiness(p.businessId);
  const rows = await clientBookings(db(), b.id, ctx.init.user.id);
  return rows.map(({ id, service_title, price, starts_at, ends_at, status: status2, cancelled_by }) => ({
    id,
    service_title,
    price,
    starts_at,
    ends_at,
    status: status2,
    cancelled_by
  }));
}
async function cancelMy(ctx, p) {
  const b = await requireBusiness(p.businessId);
  const res = await cancelBooking(db(), {
    bookingId: int(p.bookingId, "bookingId"),
    business: b,
    by: "client",
    tgId: ctx.init.user.id,
    now: ctx.now
  });
  await onBookingCancelled(db(), b, res);
  return { ok: true };
}
async function adminOverview(ctx) {
  const b = ctx.business;
  const [stats, services, staff, admins] = await Promise.all([
    businessStats(db(), b.id),
    listServices(db(), b.id, true),
    listStaff(db(), b.id, true),
    db().query(
      `select a.tg_id, a.role, u.first_name, u.username from business_admins a left join users u on u.tg_id = a.tg_id
       where a.business_id = $1 order by a.created_at`,
      [b.id]
    )
  ]);
  return { business: publicBusiness(b), role: ctx.role, stats, services, staff, admins, links: links(b) };
}
async function adminBookings(ctx, p) {
  const tz = ctx.business.timezone;
  const date = str(p.date, 10) || DateTime5.now().setZone(tz).toISODate();
  const days = Math.min(Math.max(int(p.days ?? 1, "days"), 1), 31);
  const from = dayBoundsUtc(date, tz).from;
  const to = DateTime5.fromISO(from).plus({ days }).toUTC().toISO();
  return bookingsInRange(db(), ctx.business.id, from, to);
}
async function adminCancelBooking(ctx, p) {
  const res = await cancelBooking(db(), {
    bookingId: int(p.bookingId, "bookingId"),
    business: ctx.business,
    by: "admin",
    tgId: ctx.init.user.id
  });
  await onBookingCancelled(db(), ctx.business, res);
  return { ok: true };
}
async function adminSetStatus(ctx, p) {
  const status2 = str(p.status, 20);
  if (!["done", "no_show", "confirmed"].includes(status2)) throw new UserError("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441");
  await setBookingStatus(db(), ctx.business.id, int(p.bookingId, "bookingId"), status2);
  return { ok: true };
}
async function saveService(ctx, p) {
  const s = p.service ?? {};
  const title = str(s.title, 100);
  if (title.length < 2) throw new UserError("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0443\u0441\u043B\u0443\u0433\u0438");
  const price = Math.max(0, Math.min(int(s.price ?? 0, "price"), 1e7));
  const duration = int(s.duration_min ?? 60, "duration_min");
  if (duration < 5 || duration > 720) throw new UserError("\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u2014 \u043E\u0442 5 \u0434\u043E 720 \u043C\u0438\u043D\u0443\u0442");
  const vals = [title, str(s.description), price, Boolean(s.price_from), duration, s.active !== false, int(s.sort ?? 0, "sort")];
  if (s.id) {
    const rows = await db().query(
      `update services set title=$3, description=$4, price=$5, price_from=$6, duration_min=$7, active=$8, sort=$9
       where id = $1 and business_id = $2 returning *`,
      [int(s.id, "id"), ctx.business.id, ...vals]
    );
    if (!rows.length) throw new UserError("\u0423\u0441\u043B\u0443\u0433\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
    return rows[0];
  }
  const [row2] = await db().query(
    `insert into services (business_id, title, description, price, price_from, duration_min, active, sort)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
    [ctx.business.id, ...vals]
  );
  return row2;
}
async function deleteService(ctx, p) {
  await db().query(`delete from services where id = $1 and business_id = $2`, [int(p.id, "id"), ctx.business.id]);
  return { ok: true };
}
var HM = /^([01]\d|2[0-3]):[0-5]\d$/;
function validateWorkHours(wh) {
  const out = {};
  if (!wh || typeof wh !== "object") return out;
  for (const [day, intervals] of Object.entries(wh)) {
    if (!/^[1-7]$/.test(day) || !Array.isArray(intervals)) continue;
    const list = [];
    for (const it of intervals) {
      if (!Array.isArray(it) || !HM.test(it[0]) || !(HM.test(it[1]) || it[1] === "24:00")) {
        throw new UserError("\u0412\u0440\u0435\u043C\u044F \u0440\u0430\u0431\u043E\u0442\u044B \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0427\u0427:\u041C\u041C");
      }
      if (it[0] >= it[1]) throw new UserError("\u041D\u0430\u0447\u0430\u043B\u043E \u0441\u043C\u0435\u043D\u044B \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0440\u0430\u043D\u044C\u0448\u0435 \u043A\u043E\u043D\u0446\u0430");
      list.push([it[0], it[1]]);
    }
    if (list.length) out[day] = list.sort((a, b) => a[0].localeCompare(b[0]));
  }
  return out;
}
async function saveStaff(ctx, p) {
  const s = p.staff ?? {};
  const name = str(s.name, 60);
  if (name.length < 1) throw new UserError("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F");
  const wh = validateWorkHours(s.work_hours);
  const tgId = s.tg_id ? int(s.tg_id, "tg_id") : null;
  const vals = [name, str(s.description, 200), tgId, wh, s.active !== false, int(s.sort ?? 0, "sort")];
  if (s.id) {
    const rows = await db().query(
      `update staff set name=$3, description=$4, tg_id=$5, work_hours=$6, active=$7, sort=$8
       where id = $1 and business_id = $2 returning *`,
      [int(s.id, "id"), ctx.business.id, ...vals]
    );
    if (!rows.length) throw new UserError("\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E");
    return rows[0];
  }
  const [row2] = await db().query(
    `insert into staff (business_id, name, description, tg_id, work_hours, active, sort) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [ctx.business.id, ...vals]
  );
  return row2;
}
async function deleteStaff(ctx, p) {
  const id = int(p.id, "id");
  const active = await db().query(`select id from staff where business_id = $1 and active and id <> $2`, [ctx.business.id, id]);
  if (!active.length) throw new UserError("\u041D\u0443\u0436\u0435\u043D \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u0438\u043D \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u043C\u0430\u0441\u0442\u0435\u0440");
  const has = await db().query(`select 1 from bookings where staff_id = $1 limit 1`, [id]);
  if (has.length) {
    const future = await db().query(`select 1 from bookings where staff_id = $1 and status='confirmed' and starts_at > now() limit 1`, [id]);
    if (future.length) throw new UserError("\u0423 \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u0435\u0441\u0442\u044C \u0431\u0443\u0434\u0443\u0449\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0438 \u2014 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0438\u0442\u0435 \u0438\u043B\u0438 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u0438\u0445");
    await db().query(`update staff set active = false where id = $1 and business_id = $2`, [id, ctx.business.id]);
  } else {
    await db().query(`delete from staff where id = $1 and business_id = $2`, [id, ctx.business.id]);
  }
  return { ok: true };
}
async function listTimeOff(ctx) {
  return db().query(
    `select t.*, s.name as staff_name from time_off t left join staff s on s.id = t.staff_id
     where t.business_id = $1 and t.ends_at > now() order by t.starts_at limit 100`,
    [ctx.business.id]
  );
}
async function addTimeOff(ctx, p) {
  const tz = ctx.business.timezone;
  const dateFrom = str(p.dateFrom, 10);
  const dateTo = str(p.dateTo, 10) || dateFrom;
  const d1 = DateTime5.fromISO(dateFrom, { zone: tz });
  const d2 = DateTime5.fromISO(dateTo, { zone: tz });
  if (!d1.isValid || !d2.isValid || d2 < d1) throw new UserError("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0430\u0442\u044B");
  let start = d1.startOf("day");
  let end = d2.plus({ days: 1 }).startOf("day");
  if (p.timeFrom && p.timeTo) {
    if (!HM.test(p.timeFrom) || !HM.test(p.timeTo)) throw new UserError("\u0412\u0440\u0435\u043C\u044F \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0427\u0427:\u041C\u041C");
    const [h1, m1] = p.timeFrom.split(":").map(Number);
    const [h2, m2] = p.timeTo.split(":").map(Number);
    start = d1.set({ hour: h1, minute: m1 });
    end = d2.set({ hour: h2, minute: m2 });
    if (end <= start) throw new UserError("\u041A\u043E\u043D\u0435\u0446 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043F\u043E\u0437\u0436\u0435 \u043D\u0430\u0447\u0430\u043B\u0430");
  }
  const staffId = p.staffId ? int(p.staffId, "staffId") : null;
  const [row2] = await db().query(
    `insert into time_off (business_id, staff_id, starts_at, ends_at, reason) values ($1,$2,$3,$4,$5) returning *`,
    [ctx.business.id, staffId, start.toUTC().toISO(), end.toUTC().toISO(), str(p.reason, 100)]
  );
  const conflicts = await db().query(
    `select count(*)::int as n from bookings where business_id = $1 and status = 'confirmed'
     and starts_at < $3 and ends_at > $2 and ($4::bigint is null or staff_id = $4)`,
    [ctx.business.id, row2.starts_at, row2.ends_at, staffId]
  );
  return { ...row2, conflicts: conflicts[0].n };
}
async function removeTimeOff(ctx, p) {
  await db().query(`delete from time_off where id = $1 and business_id = $2`, [int(p.id, "id"), ctx.business.id]);
  return { ok: true };
}
var PALETTES = [
  "rose",
  "lilac",
  "mint",
  "amber",
  "sky",
  "graphite",
  "banner",
  // яркие: тёмная или светлая
  "meadow",
  "checker",
  "mintlilac",
  "dustyrose",
  "cranes",
  "waves",
  "peach",
  "tiger",
  "lemonade",
  "sakura",
  // светлые по референсам
  "bw"
  // чёрно-белая
];
var isPalette = (v) => typeof v === "string" && (PALETTES.includes(v) || /^#[0-9a-f]{6}$/i.test(v));
var SETTINGS_KEYS = [
  "emoji",
  "accent",
  "description",
  "address",
  "contactPhone",
  "links",
  "welcome",
  "afterBookingText",
  "labels",
  "stepMin",
  "minLeadMin",
  "maxDaysAhead",
  "cancelHours",
  "chooseStaff",
  "requirePhone",
  "remind2h",
  "fields",
  "palette",
  "paletteMode",
  "iconStyle",
  "logoMode"
];
async function saveSettings(ctx, p) {
  const incoming = p.settings ?? {};
  const settings = {};
  for (const k of SETTINGS_KEYS) if (k in incoming) settings[k] = incoming[k];
  for (const k of ["stepMin", "minLeadMin", "maxDaysAhead", "cancelHours"]) {
    if (k in settings) settings[k] = Math.max(0, Math.min(int(settings[k], k), 1e4));
  }
  if (settings.maxDaysAhead !== void 0 && settings.maxDaysAhead > 180) settings.maxDaysAhead = 180;
  if (settings.fields) {
    settings.fields = settings.fields.slice(0, 6).map((f, i) => ({
      key: str(f.key, 20).replace(/[^a-z0-9_]/gi, "") || `f${i}`,
      label: str(f.label, 60),
      placeholder: str(f.placeholder, 80),
      required: Boolean(f.required)
    })).filter((f) => f.label);
  }
  if (settings.links) {
    settings.links = settings.links.slice(0, 6).map((l) => ({ title: str(l.title, 30), url: str(l.url, 200) })).filter((l) => l.title && /^https?:\/\//.test(l.url));
  }
  for (const k of ["description", "welcome", "afterBookingText"]) {
    if (k in settings) settings[k] = str(settings[k], 1e3);
  }
  if (settings.accent && !/^#[0-9a-f]{6}$/i.test(settings.accent)) delete settings.accent;
  if ("palette" in settings && !isPalette(settings.palette)) delete settings.palette;
  if ("paletteMode" in settings && settings.paletteMode !== "dark" && settings.paletteMode !== "light") delete settings.paletteMode;
  if ("logoMode" in settings && settings.logoMode !== "circle" && settings.logoMode !== "wordmark") delete settings.logoMode;
  if ("iconStyle" in settings && !["regular", "thin", "bold", "duo", "circle"].includes(String(settings.iconStyle))) delete settings.iconStyle;
  const b = await updateBusiness(db(), ctx.business.id, {
    name: p.name ? str(p.name, 80) : void 0,
    timezone: p.timezone ? str(p.timezone, 60) : void 0,
    settings
  });
  return publicBusiness(b);
}
var photoTag = (fileId) => fileId ? fileId.slice(-10) : "";
function imageBuf(p) {
  const b64 = String(p.imageBase64 ?? "").replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(b64, "base64");
  if (buf.length < 500) throw new UserError("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u043E\u0442\u043E");
  if (buf.length > 35e5) throw new UserError("\u0424\u043E\u0442\u043E \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435");
  return buf;
}
async function ownId(table, v, businessId) {
  if (v == null || v === "") return null;
  const id = int(v, table);
  const [row2] = await db().query(`select 1 from ${table} where id = $1 and business_id = $2`, [id, businessId]);
  if (!row2) throw new UserError("\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E");
  return id;
}
async function portfolioAdd(ctx, p) {
  const buf = imageBuf(p);
  const count = await db().query(`select count(*)::int as n from portfolio where business_id = $1`, [ctx.business.id]);
  if (count[0].n >= PORTFOLIO_MAX) throw new UserError(`\u0412 \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C ${PORTFOLIO_MAX} \u0444\u043E\u0442\u043E`);
  const staffId = await ownId("staff", p.staffId, ctx.business.id);
  const albumId = await ownId("albums", p.albumId, ctx.business.id);
  const { file_id } = await tg().sendPhoto(
    ctx.init.user.id,
    new Uint8Array(buf),
    `\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u0432 \u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E \xAB${ctx.business.name}\xBB`
  );
  const [row2] = await db().query(
    `insert into portfolio (business_id, file_id, caption, sort, staff_id, album_id) values ($1, $2, $3, $4, $5, $6)
     returning id, caption, staff_id, album_id`,
    [ctx.business.id, file_id, str(p.caption, 300), 0, staffId, albumId]
  );
  return row2;
}
async function portfolioUpdate(ctx, p) {
  const id = int(p.id, "id");
  const staffId = await ownId("staff", p.staffId, ctx.business.id);
  const albumId = await ownId("albums", p.albumId, ctx.business.id);
  const [row2] = await db().query(
    `update portfolio set caption = $3, staff_id = $4, album_id = $5 where id = $1 and business_id = $2
     returning id, caption, staff_id, album_id`,
    [id, ctx.business.id, str(p.caption, 300), staffId, albumId]
  );
  if (!row2) throw new UserError("\u0424\u043E\u0442\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E");
  return row2;
}
async function albumSave(ctx, p) {
  const a = p.album ?? {};
  const title = str(a.title, 60);
  if (!title) throw new UserError("\u041D\u0430\u0437\u043E\u0432\u0438\u0442\u0435 \u0430\u043B\u044C\u0431\u043E\u043C");
  const serviceId = await ownId("services", a.serviceId, ctx.business.id);
  const vals = [ctx.business.id, title, str(a.description, 600), serviceId];
  if (a.id) {
    const [row3] = await db().query(
      `update albums set title = $2, description = $3, service_id = $4 where business_id = $1 and id = $5 returning *`,
      [...vals, int(a.id, "id")]
    );
    if (!row3) throw new UserError("\u0410\u043B\u044C\u0431\u043E\u043C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
    return row3;
  }
  const [n] = await db().query(`select count(*)::int as n from albums where business_id = $1`, [ctx.business.id]);
  if (n.n >= 30) throw new UserError("\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 30 \u0430\u043B\u044C\u0431\u043E\u043C\u043E\u0432");
  const [row2] = await db().query(
    `insert into albums (business_id, title, description, service_id, sort) values ($1, $2, $3, $4, $5) returning *`,
    [...vals, n.n]
  );
  return row2;
}
async function albumRemove(ctx, p) {
  await db().query(`delete from albums where id = $1 and business_id = $2`, [int(p.id, "id"), ctx.business.id]);
  return { ok: true };
}
async function staffPhotoSet(ctx, p) {
  const staffId = await ownId("staff", p.staffId, ctx.business.id);
  if (!staffId) throw new UserError("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0430\u0441\u0442\u0435\u0440\u0430");
  const { file_id } = await tg().sendPhoto(ctx.init.user.id, new Uint8Array(imageBuf(p)), `\u0424\u043E\u0442\u043E \u043C\u0430\u0441\u0442\u0435\u0440\u0430 \xAB${ctx.business.name}\xBB`);
  await db().query(`update staff set photo_file_id = $2 where id = $1`, [staffId, file_id]);
  return { photo: photoTag(file_id) };
}
async function staffPhotoRemove(ctx, p) {
  const staffId = await ownId("staff", p.staffId, ctx.business.id);
  await db().query(`update staff set photo_file_id = '' where id = $1`, [staffId]);
  return { ok: true };
}
async function logoSet(ctx, p) {
  const buf = imageBuf(p);
  const png = /^data:image\/png/.test(String(p.imageBase64 ?? ""));
  const t = tg();
  const caption = `\u041B\u043E\u0433\u043E\u0442\u0438\u043F \xAB${ctx.business.name}\xBB`;
  const { file_id } = png && t.sendDocument ? await t.sendDocument(ctx.init.user.id, new Uint8Array(buf), "logo.png", caption) : await t.sendPhoto(ctx.init.user.id, new Uint8Array(buf), caption);
  const b = await updateBusiness(db(), ctx.business.id, { settings: { logoFileId: file_id, logoAlpha: png } });
  return publicBusiness(b);
}
async function logoRemove(ctx) {
  const b = await updateBusiness(db(), ctx.business.id, { settings: { logoFileId: "", logoAlpha: false } });
  return publicBusiness(b);
}
async function portfolioRemove(ctx, p) {
  await db().query(`delete from portfolio where id = $1 and business_id = $2`, [int(p.id, "id"), ctx.business.id]);
  return { ok: true };
}
async function bannerSet(ctx, p) {
  const b64 = String(p.imageBase64 ?? "").replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(b64, "base64");
  if (buf.length < 1e3) throw new UserError("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u043E\u0442\u043E");
  if (buf.length > 35e5) throw new UserError("\u0424\u043E\u0442\u043E \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435");
  const color = /^#[0-9a-f]{6}$/i.test(String(p.color ?? "")) ? String(p.color).toLowerCase() : "";
  const { file_id } = await tg().sendPhoto(ctx.init.user.id, new Uint8Array(buf), `\u041D\u043E\u0432\u044B\u0439 \u0431\u0430\u043D\u043D\u0435\u0440 \xAB${ctx.business.name}\xBB`);
  const b = await updateBusiness(db(), ctx.business.id, { settings: { bannerFileId: file_id, bannerColor: color } });
  return publicBusiness(b);
}
async function bannerRemove(ctx) {
  const b = await updateBusiness(db(), ctx.business.id, { settings: { bannerFileId: "", bannerColor: "" } });
  return publicBusiness(b);
}
async function adminClients(ctx) {
  const rows = await db().query(
    `select c.tg_id, c.name, c.phone, c.last_seen, c.blocked_bot, coalesce(u.person_id, c.tg_id) as person,
       (select count(*) from bookings b where b.business_id = c.business_id and b.client_tg_id = c.tg_id and b.status in ('confirmed','done'))::int as visits
     from clients c left join users u on u.tg_id = c.tg_id
     where c.business_id = $1 order by c.last_seen desc limit 1000`,
    [ctx.business.id]
  );
  return groupClients(rows);
}
function groupClients(rows) {
  const byKey = /* @__PURE__ */ new Map();
  const personKey = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const digits = String(r.phone ?? "").replace(/\D/g, "").replace(/^8(?=\d{10}$)/, "7");
    const pk = `p:${r.person}`;
    const key = digits ? `t:${digits}` : personKey.get(pk) ?? pk;
    personKey.set(pk, key);
    const g = byKey.get(key);
    if (!g) {
      byKey.set(key, {
        tg_id: Number(r.tg_id),
        tg_ids: [Number(r.tg_id)],
        name: r.name,
        names: r.name ? [r.name] : [],
        phone: r.phone,
        last_seen: r.last_seen,
        blocked_bot: r.blocked_bot,
        visits: r.visits
      });
    } else {
      g.tg_ids.push(Number(r.tg_id));
      if (r.name && !g.names.some((n) => n.toLowerCase() === String(r.name).toLowerCase())) g.names.push(r.name);
      g.visits += r.visits;
      g.blocked_bot = g.blocked_bot && r.blocked_bot;
      if (!g.phone && r.phone) g.phone = r.phone;
    }
  }
  return [...byKey.values()].map((g) => ({ ...g, name: g.names.join(" \xB7 ") }));
}
async function adminInvite(ctx, p) {
  const role = p.role === "owner" ? "owner" : "admin";
  if (role === "owner" && ctx.role !== "super" && ctx.role !== "owner") throw new UserError("\u041D\u0435\u0442 \u043F\u0440\u0430\u0432");
  const code = await createInvite(db(), ctx.business.id, role, ctx.init.user.id);
  return { link: inviteLink(code), maxLink: maxOn() ? maxInviteLink(code) : void 0, role };
}
async function adminRemove(ctx, p) {
  const tgId = int(p.tgId, "tgId");
  const [target] = await db().query(`select role from business_admins where business_id = $1 and tg_id = $2`, [ctx.business.id, tgId]);
  if (!target) return { ok: true };
  if (target.role === "owner") {
    const owners = await db().query(`select count(*)::int as n from business_admins where business_id = $1 and role='owner'`, [ctx.business.id]);
    if (owners[0].n <= 1 && ctx.role !== "super") throw new UserError("\u041D\u0435\u043B\u044C\u0437\u044F \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0435\u0434\u0438\u043D\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0433\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430");
  }
  await db().query(`delete from business_admins where business_id = $1 and tg_id = $2`, [ctx.business.id, tgId]);
  return { ok: true };
}
async function adminBroadcast(ctx, p) {
  const text = str(p.text, 3e3);
  if (text.length < 3) throw new UserError("\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0440\u0430\u0441\u0441\u044B\u043B\u043A\u0438");
  const [last] = await db().query(`select settings->>'lastBroadcastAt' as at from businesses where id = $1`, [ctx.business.id]);
  if (last?.at && Date.now() - Date.parse(last.at) < 6 * 36e5 && ctx.role !== "super") {
    throw new UserError("\u0420\u0430\u0441\u0441\u044B\u043B\u043A\u0443 \u043C\u043E\u0436\u043D\u043E \u0434\u0435\u043B\u0430\u0442\u044C \u043D\u0435 \u0447\u0430\u0449\u0435 \u0440\u0430\u0437\u0430 \u0432 6 \u0447\u0430\u0441\u043E\u0432");
  }
  await db().query(`update businesses set settings = settings || jsonb_build_object('lastBroadcastAt', now()::text) where id = $1`, [
    ctx.business.id
  ]);
  return broadcast(db(), ctx.business, text);
}
async function superList() {
  const [businesses, stats] = await Promise.all([allBusinesses(db()), platformStats(db())]);
  return { businesses: businesses.map((b) => ({ ...b, links: { client: clientLink(b.slug), admin: adminLink(b.slug) } })), stats };
}
async function superCreate(ctx, p) {
  const b = await createBusinessFromTemplate(db(), {
    templateId: str(p.templateId, 30),
    name: str(p.name, 80),
    slug: p.slug ? str(p.slug, 40) : void 0,
    createdBy: ctx.init.user.id,
    timezone: p.timezone ? str(p.timezone, 60) : void 0
  });
  const code = await createInvite(db(), b.id, "owner", ctx.init.user.id);
  return { business: publicBusiness(b), links: links(b), ownerInvite: inviteLink(code), ownerInviteMax: maxOn() ? maxInviteLink(code) : void 0 };
}
async function superSetStatus(_ctx, p) {
  const status2 = p.status === "blocked" ? "blocked" : "active";
  await db().query(`update businesses set status = $2 where id = $1`, [int(p.businessId, "businessId"), status2]);
  return { ok: true };
}
async function superDelete(_ctx, p) {
  const id = int(p.businessId, "businessId");
  const b = await requireBusiness(id);
  if (str(p.confirm, 60) !== b.slug) throw new UserError("\u0414\u043B\u044F \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443-\u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u0431\u0438\u0437\u043D\u0435\u0441\u0430");
  await db().query(`delete from businesses where id = $1`, [id]);
  return { ok: true };
}
var methods = {
  boot: { need: "user", fn: boot },
  availability: { need: "user", fn: availability2 },
  book: { need: "user", fn: book },
  myBookings: { need: "user", fn: myBookings },
  cancelMy: { need: "user", fn: cancelMy },
  "admin.overview": { need: "admin", fn: adminOverview },
  "admin.bookings": { need: "admin", fn: adminBookings },
  "admin.cancelBooking": { need: "admin", fn: adminCancelBooking },
  "admin.setStatus": { need: "admin", fn: adminSetStatus },
  "admin.saveService": { need: "admin", fn: saveService },
  "admin.deleteService": { need: "admin", fn: deleteService },
  "admin.saveStaff": { need: "admin", fn: saveStaff },
  "admin.deleteStaff": { need: "admin", fn: deleteStaff },
  "admin.timeOff": { need: "admin", fn: listTimeOff },
  "admin.addTimeOff": { need: "admin", fn: addTimeOff },
  "admin.removeTimeOff": { need: "admin", fn: removeTimeOff },
  "admin.saveSettings": { need: "admin", fn: saveSettings },
  "admin.portfolio": {
    need: "admin",
    fn: async (ctx) => {
      const [photos, albums] = await Promise.all([listPortfolio(db(), ctx.business.id), listAlbums(db(), ctx.business.id)]);
      return {
        photos: photos.map((x) => ({ id: x.id, caption: x.caption, staffId: x.staff_id == null ? null : Number(x.staff_id), albumId: x.album_id == null ? null : Number(x.album_id) })),
        albums: albums.map((a) => ({ id: Number(a.id), title: a.title, description: a.description, serviceId: a.service_id == null ? null : Number(a.service_id) }))
      };
    }
  },
  "admin.portfolioAdd": { need: "admin", fn: portfolioAdd },
  "admin.portfolioUpdate": { need: "admin", fn: portfolioUpdate },
  "admin.albumSave": { need: "admin", fn: albumSave },
  "admin.albumRemove": { need: "admin", fn: albumRemove },
  "admin.staffPhotoSet": { need: "admin", fn: staffPhotoSet },
  "admin.staffPhotoRemove": { need: "admin", fn: staffPhotoRemove },
  "admin.logoSet": { need: "admin", fn: logoSet },
  "admin.logoRemove": { need: "admin", fn: logoRemove },
  "admin.bannerSet": { need: "admin", fn: bannerSet },
  "admin.bannerRemove": { need: "admin", fn: bannerRemove },
  "admin.portfolioRemove": { need: "admin", fn: portfolioRemove },
  "admin.clients": { need: "admin", fn: adminClients },
  "admin.invite": { need: "admin", fn: adminInvite },
  "admin.removeAdmin": { need: "owner", fn: adminRemove },
  "admin.broadcast": { need: "owner", fn: adminBroadcast },
  "super.list": { need: "super", fn: superList },
  "super.create": { need: "super", fn: superCreate },
  "super.setStatus": { need: "super", fn: superSetStatus },
  "super.delete": { need: "super", fn: superDelete }
};
async function dispatch(method, params, ctx) {
  const m = methods[method];
  if (!m) throw new UserError("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u043C\u0435\u0442\u043E\u0434");
  const uid = ctx.init.user.id;
  const isSuper2 = config.superadmins.includes(uid);
  if (m.need === "user") return m.fn(ctx, params);
  if (m.need === "super") {
    if (!isSuper2) throw new UserError("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430");
    return m.fn(ctx, params);
  }
  const business = await requireBusiness(params.businessId);
  const role = await roleFor(db(), uid, business.id, config.superadmins);
  if (!role) throw new UserError("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u044D\u0442\u043E\u043C\u0443 \u0431\u0438\u0437\u043D\u0435\u0441\u0443");
  if (m.need === "owner" && role === "admin") throw new UserError("\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443");
  return m.fn({ ...ctx, business, role }, params);
}

// server/handler.ts
init_store();
init_telegram();
init_max();
import { timingSafeEqual as timingSafeEqual2 } from "node:crypto";
var maxHelpers = { decodeMaxStart, fromMaxUserId };
var json = (data, status2 = 200, headers = {}) => new Response(JSON.stringify(data), { status: status2, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
var webhook = null;
function cronAuthorized(req, url) {
  if ((req.headers.get("user-agent") ?? "").startsWith("vercel-cron/")) return true;
  const secret = config.cronSecret;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}` || url.searchParams.get("key") === secret;
}
var platformLoadedAt = 0;
var webhookEnsured = false;
var maxEnsured = false;
var maxState = { bot: null, webhook: null, error: null };
var maxWebhookUrl = () => `${config.publicUrl}/api/max`;
async function refreshPlatform(force = false) {
  if (!force && Date.now() - platformLoadedAt < 6e4) return;
  platformLoadedAt = Date.now();
  try {
    const rows = await db().query(`select tg_id from platform_admins`);
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
  if (config.maxBotToken && config.isProduction && !maxEnsured) {
    try {
      const { setupMax: setupMax2 } = await Promise.resolve().then(() => (init_max(), max_exports));
      Object.assign(maxState, await setupMax2(maxWebhookUrl()), { error: null });
      maxEnsured = true;
    } catch (e) {
      maxState.error = String(e?.message ?? e).slice(0, 200);
      console.error("max setup", e);
    }
  }
}
function verifyMaxInit(raw) {
  if (!config.maxBotToken) throw new AuthError("MAX \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D");
  const init = verifyInitData(raw, config.maxBotToken);
  const { decodeMaxStart: decodeMaxStart2, fromMaxUserId: fromMaxUserId2 } = maxHelpers;
  return { ...init, user: { ...init.user, id: fromMaxUserId2(init.user.id) }, startParam: decodeMaxStart2(init.startParam).b };
}
async function maxWebhook(req) {
  const got = Buffer.from(req.headers.get("x-max-bot-api-secret") ?? "");
  const want = Buffer.from(config.maxWebhookSecret);
  if (!config.maxBotToken || got.length !== want.length || !timingSafeEqual2(got, want)) return new Response("forbidden", { status: 403 });
  const update = await req.json().catch(() => null);
  try {
    const { handleMaxUpdate: handleMaxUpdate2 } = await Promise.resolve().then(() => (init_maxbot(), maxbot_exports));
    await handleMaxUpdate2(update);
  } catch (e) {
    console.error("max update", e);
  }
  return json({ ok: true });
}
async function rpc(req) {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const maxRaw = req.headers.get("x-max-init-data");
    const init = maxRaw ? verifyMaxInit(maxRaw) : verifyInitData(req.headers.get("x-init-data") ?? "", config.botToken);
    const body = await req.json();
    const result = await dispatch(String(body.method ?? ""), body.params ?? {}, { init });
    return json({ result });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, 401);
    if (e instanceof UserError) return json({ error: e.message }, 400);
    console.error("rpc error", e);
    return json({ error: "\u0427\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437." }, 500);
  }
}
async function photo(url) {
  const q = url.searchParams;
  const kind = q.has("banner") ? "banner" : q.has("logo") ? "logo" : q.has("staff") ? "staff" : "id";
  const id = Number(q.get(kind));
  if (!Number.isInteger(id)) return new Response("bad id", { status: 400 });
  const sql = {
    banner: `select settings->>'bannerFileId' as file_id from businesses where id = $1`,
    logo: `select settings->>'logoFileId' as file_id from businesses where id = $1`,
    staff: `select photo_file_id as file_id from staff where id = $1`,
    id: `select file_id from portfolio where id = $1`
  }[kind];
  const [row2] = await db().query(sql, [id]);
  if (!row2?.file_id) return new Response("not found", { status: 404 });
  const file = await rawApi().getFile(row2.file_id);
  const res = await fetch(`https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`);
  if (!res.ok) return new Response("upstream error", { status: 502 });
  return new Response(res.body, {
    headers: {
      // логотип хранится файлом (PNG с прозрачностью) — Telegram отдаёт его без типа картинки
      "content-type": /\.png$/i.test(file.file_path ?? "") ? "image/png" : /\.webp$/i.test(file.file_path ?? "") ? "image/webp" : "image/jpeg",
      "cache-control": "public, max-age=86400, s-maxage=31536000, immutable"
    }
  });
}
var SETUP_V = "2";
var webhookUrl = () => `${config.publicUrl}/api/bot?v=${config.webhookSecret.slice(0, 8)}${SETUP_V}`;
async function setupBot() {
  const api2 = rawApi();
  await api2.setWebhook(webhookUrl(), {
    secret_token: config.webhookSecret || void 0,
    allowed_updates: ["message", "callback_query", "my_chat_member"]
  });
  await api2.setMyCommands([
    { command: "start", description: "\u0413\u043B\u0430\u0432\u043D\u043E\u0435 \u043C\u0435\u043D\u044E" },
    { command: "masters", description: "\u041C\u043E\u0438 \u043C\u0430\u0441\u0442\u0435\u0440\u0430" },
    { command: "admin", description: "\u041F\u0430\u043D\u0435\u043B\u044C \u0434\u043B\u044F \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0435\u0432 \u0431\u0438\u0437\u043D\u0435\u0441\u0430" },
    { command: "help", description: "\u041F\u043E\u043C\u043E\u0449\u044C" }
  ]);
  await api2.setChatMenuButton({ menu_button: { type: "web_app", text: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C", web_app: { url: webAppUrl() } } });
  await api2.setMyShortDescription("\u041E\u043D\u043B\u0430\u0439\u043D-\u0437\u0430\u043F\u0438\u0441\u044C \u043A \u043C\u0430\u0441\u0442\u0435\u0440\u0430\u043C \u0438 \u0432 \u0441\u0430\u043B\u043E\u043D\u044B \u043F\u0440\u044F\u043C\u043E \u0432 Telegram");
  await api2.setMyDescription(
    "\u0417\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0439\u0442\u0435\u0441\u044C \u043A \u043C\u0430\u0441\u0442\u0435\u0440\u0443 \u0432 \u043F\u0430\u0440\u0443 \u043A\u0430\u0441\u0430\u043D\u0438\u0439: \u0432\u044B\u0431\u043E\u0440 \u0443\u0441\u043B\u0443\u0433\u0438, \u0443\u0434\u043E\u0431\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F, \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F. \u041F\u0440\u0435\u0434\u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0442\u0435\u043B\u044F\u043C \u2014 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u0430\u044F \u043E\u043D\u043B\u0430\u0439\u043D-\u0437\u0430\u043F\u0438\u0441\u044C \u0434\u043B\u044F \u0431\u0438\u0437\u043D\u0435\u0441\u0430."
  );
}
async function status() {
  try {
    await db().query("select 1");
  } catch (e) {
    return json({ ok: false, db: false, error: String(e?.message ?? e).replace(/postgres(ql)?:\/\/[^\s]+/g, "<url>") }, 500);
  }
  const info = config.botToken ? await rawApi().getWebhookInfo().catch(() => null) : null;
  const schemaError = await db().query(`select phone, person_id from users limit 1`).then(() => db().query(`select id from link_requests limit 1`)).then(() => null).catch((e) => String(e?.message ?? e).slice(0, 160));
  return json({
    ok: true,
    db: true,
    bot: config.botUsername || null,
    webhook: info?.url ?? null,
    pending: info?.pending_update_count ?? null,
    lastError: info?.last_error_message ?? null,
    superadmins: config.superadmins.length,
    schema: schemaError ? `\u043E\u0448\u0438\u0431\u043A\u0430: ${schemaError}` : "ok",
    publicUrl: config.publicUrl,
    production: config.isProduction,
    max: config.maxBotToken ? { ...maxState, bot: config.maxBotName || maxState.bot } : "\u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D (\u043D\u0435\u0442 MAX_BOT_TOKEN)"
  });
}
async function handle(req) {
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
      webhook ??= webhookCallback(getBot(), "std/http", { timeoutMilliseconds: 25e3 });
      return webhook(req);
    }
    case "max":
      return maxWebhook(req);
    case "log": {
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

// server/entry.ts
var entry_default = {
  fetch(request2) {
    return handle(request2);
  }
};
export {
  entry_default as default
};
