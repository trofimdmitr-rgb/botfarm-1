// Локальный запуск без Telegram и Supabase: встроенный Postgres (PGlite), фейковая подпись initData,
// сообщения бота печатаются в консоль. Запуск: npm run build && npm run local → http://localhost:8787/?devUser=1
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

process.env.BOT_TOKEN ||= "100000:LOCAL_DEV_TOKEN";
process.env.BOT_USERNAME ||= "local_farm_bot";
process.env.SUPERADMIN_IDS ||= "1";
process.env.PUBLIC_URL ||= "http://localhost:8787";
process.env.MAX_BOT_TOKEN ||= "max-local-token"; // для автотестов мини-аппа в MAX
process.env.MAX_BOT_USERNAME ||= "local_max_bot";

const { createPgliteDb } = await import("../server/pglite");
const { setDb } = await import("../server/db");
const { setSender } = await import("../server/telegram");
const { handle } = await import("../server/handler");
const store = await import("../server/store");

const db = await createPgliteDb();
setDb(db);
// последние сообщения бота — для предпросмотра: GET /api/dev-messages
const outbox: { chatId: number; html: string; at: string }[] = [];
setSender({
  sendMessage: async (chatId, html) => {
    outbox.push({ chatId, html, at: new Date().toISOString() });
    if (outbox.length > 50) outbox.shift();
    console.log(`\n→ ${chatId}\n${html.replace(/<[^>]+>/g, "")}`);
  },
  sendPhoto: async () => ({ file_id: `local-${Date.now()}` }),
  setChatMenuButton: async () => ({}),
});

// демо-данные: по бизнесу на каждый шаблон, владелец первого — пользователь 2
const demo: [string, string][] = [
  ["beauty", "Ногти Анны"],
  ["barber", "Барбершоп Борода"],
  ["tutor", "Математика с Ильёй"],
  ["wellness", "Массаж Ольги"],
  ["auto", "Детейлинг 63"],
];
for (const [i, [tpl, name]] of demo.entries()) {
  const b = await store.createBusinessFromTemplate(db, { templateId: tpl, name, ownerTgId: i === 0 ? 2 : undefined, timezone: "Europe/Samara" });
  if (i === 3) await store.updateBusiness(db, b.id, { settings: { bannerFileId: "demo-banner-2" } });
  if (i === 0) {
    await store.updateBusiness(db, b.id, {
      settings: {
        address: "Самара, ул. Ленинградская, 45",
        contactPhone: "+7 927 000-00-00",
        description: "Аппаратный маникюр, укрепление, дизайн. Стерильные инструменты.",
        links: [{ title: "Instagram", url: "https://instagram.com" }, { title: "Канал", url: "https://t.me/telegram" }],
        bannerFileId: "demo-banner",
      },
    });
    // логотип-значок, альбом «Маникюр» к услуге и подписи к фото
    await store.updateBusiness(db, b.id, { settings: { logoFileId: "demo-logo-circle", logoAlpha: true, logoMode: "circle" } });
    const [svc] = await db.query(`select id from services where business_id = $1 order by sort offset 1 limit 1`, [b.id]);
    const [al] = await db.query(
      `insert into albums (business_id, title, description, service_id, sort) values ($1, 'Маникюр', 'Аппаратный маникюр с покрытием гель-лаком: выравнивание, укрепление, держится 3–4 недели.', $2, 0) returning id`,
      [b.id, svc.id],
    );
    const [al2] = await db.query(`insert into albums (business_id, title, description, sort) values ($1, 'Дизайн', 'Втирка, стемпинг, френч — по вашему фото.', 1) returning id`, [b.id]);
    const caps = ["Нюд с блёстками", "Френч", "", "Втирка «кошачий глаз»", "", "Укрепление"];
    for (let k = 0; k < 6; k++) {
      await db.query(`insert into portfolio (business_id, file_id, caption, sort, album_id) values ($1, $2, $3, $4, $5)`, [b.id, `demo-${k}`, caps[k], k, k < 3 ? al.id : k < 5 ? al2.id : null]);
    }
  }
  if (i === 1) {
    // у мастеров барбершопа — фото
    await db.query(`update staff set photo_file_id = 'demo-staff-' || id where business_id = $1`, [b.id]);
  }
  if (i === 3) {
    // логотип-надпись вместо названия, два мастера с фото, работы по мастерам и альбом к услуге
    await store.updateBusiness(db, b.id, { settings: { logoFileId: "demo-logo-word", logoAlpha: true, logoMode: "wordmark", chooseStaff: true } });
    const [st1] = await db.query(`select id from staff where business_id = $1`, [b.id]);
    await db.query(`update staff set name = 'Ольга', photo_file_id = 'demo-staff-' || id where id = $1`, [st1.id]);
    const [st2] = await db.query(
      `insert into staff (business_id, name, description, work_hours, active, sort, photo_file_id) select business_id, 'Ирина', 'Спортивный массаж', work_hours, true, 1, '' from staff where id = $1 returning id`,
      [st1.id],
    );
    await db.query(`update staff set photo_file_id = 'demo-staff-' || id where id = $1`, [st2.id]);
    const [svc] = await db.query(`select id from services where business_id = $1 order by sort limit 1`, [b.id]);
    const [al] = await db.query(`insert into albums (business_id, title, description, service_id, sort) values ($1, 'Классический массаж', 'Расслабляющий массаж всего тела, 60 минут.', $2, 0) returning id`, [b.id, svc.id]);
    for (let k = 0; k < 6; k++) {
      await db.query(`insert into portfolio (business_id, file_id, caption, sort, album_id, staff_id) values ($1, $2, $3, $4, $5, $6)`, [b.id, `demo-m${k}`, k % 2 ? "Кабинет" : "", k, k < 4 ? al.id : null, k % 2 ? st2.id : st1.id]);
    }
  }
}

function signInit(userId: number, start: string) {
  const fields: Record<string, string> = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: userId === 1 ? "Антон" : userId === 2 ? "Анна" : `Гость ${userId}` }),
  };
  if (start) fields.start_param = start;
  const check = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(process.env.BOT_TOKEN!).digest();
  return new URLSearchParams({ ...fields, hash: createHmac("sha256", secret).update(check).digest("hex") }).toString();
}

const dist = join(process.cwd(), "dist");
const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost:8787");
  try {
    if (url.pathname === "/api/dev-messages") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(outbox));
      return;
    }
    if (url.pathname === "/api/dev-init") {
      res.end(signInit(Number(url.searchParams.get("user") ?? 1), url.searchParams.get("start") ?? ""));
      return;
    }
    // фото хранятся в Telegram, которого локально нет — отдаём картинку-заглушку
    if (url.pathname === "/api/photo" && url.searchParams.has("logo")) {
      // логотип с прозрачным фоном: тёмный (проверка «сливается с тёмной темой») — надпись или значок
      const word = url.searchParams.get("logo") !== "1";
      res.writeHead(200, { "content-type": "image/svg+xml" });
      res.end(
        word
          ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 160"><path d="M40 120 C 60 30, 120 30, 130 80 S 200 140, 220 50" fill="none" stroke="#2a1e3a" stroke-width="14" stroke-linecap="round"/><text x="250" y="105" font-family="Georgia, serif" font-style="italic" font-size="74" fill="#2a1e3a">Ольга</text></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100 30 C 130 70, 160 90, 100 170 C 40 90, 70 70, 100 30Z" fill="#c2185b"/><circle cx="100" cy="105" r="22" fill="#fff"/></svg>`,
      );
      return;
    }
    if (url.pathname === "/api/photo" && url.searchParams.has("staff")) {
      const hue = (Number(url.searchParams.get("staff")) * 83) % 360;
      res.writeHead(200, { "content-type": "image/svg+xml" });
      res.end(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="hsl(${hue},35%,72%)"/><circle cx="100" cy="82" r="38" fill="hsl(${hue},30%,40%)"/><path d="M30 200 C 40 130, 160 130, 170 200Z" fill="hsl(${hue},30%,40%)"/></svg>`);
      return;
    }
    if (url.pathname === "/api/photo") {
      const hue = url.searchParams.has("banner") ? (Number(url.searchParams.get("banner")) * 47 + 290) % 360 : (Number(url.searchParams.get("id")) * 47) % 360;
      res.writeHead(200, { "content-type": "image/svg+xml" });
      res.end(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,62%)"/><stop offset="1" stop-color="hsl(${hue + 60},60%,35%)"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="1200" cy="260" r="160" fill="hsl(${hue + 30},90%,85%)" opacity=".85"/><path d="M0 700 L400 420 L700 620 L1050 360 L1600 680 L1600 900 L0 900Z" fill="hsl(${hue + 90},40%,25%)" opacity=".8"/><circle cx="380" cy="230" r="70" fill="#fff" opacity=".5"/></svg>`);
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const request = new Request(url, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
      });
      const r = await handle(request);
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    let file = join(dist, url.pathname === "/" ? "index.html" : url.pathname);
    if (!existsSync(file)) file = join(dist, "index.html");
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end(String(e));
  }
}).listen(8787, () => console.log("Локально: http://localhost:8787/?devUser=1  (1 — суперадмин, 2 — владелец «Ногти Анны», 3+ — клиенты)"));
