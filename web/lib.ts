// Обёртки над Telegram WebApp, API и форматированием.
import { createContext, useContext, useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram?: { WebApp: any };
    WebApp?: any; // мост MAX (https://st.max.ru/js/max-web-app.js)
  }
}

export const WA: any = window.Telegram?.WebApp ?? null;
export const inTelegram = Boolean(WA?.initData);
/** Мини-апп открыт в MAX: свой мост window.WebApp, своя подпись initData, нет темы и нижней кнопки. */
export const MAXA: any = !inTelegram && window.WebApp?.initData ? window.WebApp : null;
export const inMax = Boolean(MAXA);

/** Параметры запуска: из адреса (?b=&view=), а в MAX — из ?startapp=slug__view. */
function launchParams(): URLSearchParams {
  const q = new URLSearchParams(location.search);
  const sp: string = MAXA?.initDataUnsafe?.start_param ?? "";
  if (sp && !q.get("b") && !q.get("view")) {
    const [b, view] = sp.split("__");
    if (b) q.set("b", b);
    if (view) q.set("view", view);
  }
  return q;
}

let devInitData = "";

export async function ensureDevAuth() {
  if (inTelegram || inMax) return;
  const q = new URLSearchParams(location.search);
  const user = q.get("devUser") ?? localStorageGet("devUser") ?? "1";
  const res = await fetch(`/api/dev-init?user=${encodeURIComponent(user)}&start=${encodeURIComponent(q.get("start") ?? "")}`);
  if (res.ok) devInitData = await res.text();
}

function localStorageGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

export class ApiError extends Error {}

export async function api<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/rpc", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(inMax ? { "x-max-init-data": MAXA.initData } : { "x-init-data": WA?.initData || devInitData }),
    },
    body: JSON.stringify({ method, params }),
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new ApiError("Нет связи с сервером. Проверьте интернет.");
  }
  if (!res.ok) throw new ApiError(data?.error ?? "Ошибка");
  return data.result as T;
}

export const startParam: string | undefined = WA?.initDataUnsafe?.start_param || undefined;
export const urlParams = launchParams();

export function haptic(kind: "success" | "error" | "warning" | "light" = "light") {
  try {
    const h = inMax ? MAXA.HapticFeedback : WA?.HapticFeedback;
    if (kind === "light") h?.impactOccurred("light");
    else h?.notificationOccurred(kind);
  } catch {}
}

export function alertMsg(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (inTelegram && WA?.showAlert) WA.showAlert(text, () => resolve());
    else void inAppDialog(text, false).then(() => resolve());
  });
}

export function confirmMsg(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (inTelegram && WA?.showConfirm) WA.showConfirm(text, (ok: boolean) => resolve(ok));
    else void inAppDialog(text, true).then(resolve);
  });
}

/** Своё окно вместо alert/confirm — вне Telegram (MAX, браузер) системные окна выглядят чужеродно или не работают. */
function inAppDialog(text: string, withCancel: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "dlg-wrap";
    wrap.innerHTML = `<div class="dlg" role="dialog"><div class="dlg-text"></div><div class="dlg-actions">${
      withCancel ? '<button class="btn btn-secondary" data-v="0">Отмена</button>' : ""
    }<button class="btn btn-primary" data-v="1">${withCancel ? "Да" : "Понятно"}</button></div></div>`;
    (wrap.querySelector(".dlg-text") as HTMLElement).textContent = text;
    wrap.addEventListener("click", (e) => {
      const v = (e.target as HTMLElement).closest("button")?.getAttribute("data-v");
      if (v == null && e.target !== wrap) return;
      wrap.remove();
      resolve(v === "1");
    });
    document.body.appendChild(wrap);
    (wrap.querySelector('[data-v="1"]') as HTMLElement).focus();
  });
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function shareLink(url: string, text: string) {
  if (inMax) {
    try {
      return MAXA.shareMaxContent({ text, link: url });
    } catch {}
  }
  const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  if (WA?.openTelegramLink) WA.openTelegramLink(share);
  else window.open(share, "_blank");
}

export function openLink(url: string) {
  if (inMax) {
    if (url.startsWith("https://max.ru/") && MAXA.openMaxLink) return MAXA.openMaxLink(url);
    if (MAXA.openLink) return MAXA.openLink(url);
  }
  if (url.startsWith("https://t.me/") && WA?.openTelegramLink) WA.openTelegramLink(url);
  else if (inTelegram && WA?.openLink) WA.openLink(url);
  else window.open(url, "_blank");
}

/** Попросить разрешение писать в личку — иначе клиент, открывший приложение по прямой ссылке, не получит напоминания. */
export function ensureWriteAccess(): Promise<void> {
  return new Promise((resolve) => {
    if (!inTelegram || !WA?.requestWriteAccess || WA.initDataUnsafe?.user?.allows_write_to_pm) return resolve();
    try {
      WA.requestWriteAccess(() => resolve());
    } catch {
      resolve();
    }
  });
}

// ---------- даты ----------

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, opts: Intl.DateTimeFormatOptions) {
  const key = tz + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("ru-RU", { timeZone: tz, ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

export const fmtTime = (iso: string | Date, tz: string) => fmt(tz, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const fmtDay = (iso: string | Date, tz: string) => fmt(tz, { weekday: "short", day: "numeric", month: "long" }).format(new Date(iso));
export const fmtDayShort = (iso: string | Date, tz: string) => fmt(tz, { day: "numeric", month: "short" }).format(new Date(iso));
export const fmtWeekday = (iso: string | Date, tz: string) => fmt(tz, { weekday: "short" }).format(new Date(iso));

/** YYYY-MM-DD → Date в полдень UTC (для отображения даты без сдвигов). */
export const dateOnly = (d: string) => new Date(`${d}T12:00:00Z`);

export function todayIn(tz: string): string {
  const p = fmt(tz, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const rub = (n: number, from = false) => (n === 0 ? "бесплатно" : `${from ? "от " : ""}${n.toLocaleString("ru-RU")}\u00a0₽`);

export function duration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} ч` : "", m ? `${m} мин` : ""].filter(Boolean).join(" ");
}

export const photoUrl = (id: number) => `/api/photo?id=${id}`;

/** Баннер бизнеса; хвост file_id в адресе сбрасывает кэш при замене фото. */
export const bannerUrl = (businessId: number, fileId?: string) =>
  fileId ? `/api/photo?banner=${businessId}&v=${encodeURIComponent(fileId.slice(-12))}` : null;

/**
 * Открыть фото из файла. createImageBitmap есть не во всех встроенных браузерах (Telegram Desktop, старые WebView)
 * и не понимает часть форматов — тогда пробуем обычный <img>. Не вышло — понятная ошибка вместо английской.
 */
export async function decodeImage(file: File): Promise<{ src: CanvasImageSource; w: number; h: number }> {
  try {
    const bmp = await createImageBitmap(file);
    return { src: bmp, w: bmp.width, h: bmp.height };
  } catch {}
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((ok, bad) => {
      img.onload = () => ok();
      img.onerror = () => bad(new Error("decode"));
      img.src = url;
    });
    if (!img.naturalWidth) throw new Error("decode");
    return { src: img, w: img.naturalWidth, h: img.naturalHeight };
  } catch {
    const ext = (file.name.split(".").pop() || "").toUpperCase();
    throw new ApiError(
      `Не получилось открыть фото${ext ? ` (${ext})` : ""}. Сохраните его как JPG или PNG и попробуйте снова — или загрузите с телефона.`,
    );
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

/** Сжать фото в браузере перед загрузкой (≤max px по длинной стороне, JPEG). */
export async function compressImage(file: File, max = 1600): Promise<string> {
  const { src, w, h } = await decodeImage(file);
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // прозрачный PNG — на белом, а не на чёрном
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Записать ошибку загрузки в логи сервера (без персональных данных) — чтобы видеть, что ломается на компьютерах. */
export function logClientError(where: string, e: unknown, file?: File) {
  try {
    const msg = `${where}: ${(e as any)?.message ?? e}${file ? ` [${file.type || "?"} ${Math.round(file.size / 1024)}KB]` : ""}`;
    navigator.sendBeacon?.("/api/log", JSON.stringify({ msg: msg.slice(0, 500), ua: navigator.userAgent, tg: WA?.platform ?? "", max: inMax }));
  } catch {}
}

/**
 * Преобладающий цвет картинки: уменьшаем до 48×48, раскладываем пиксели по «корзинам» цвета
 * (насыщенные пиксели весят больше, почти белые/чёрные — меньше) и усредняем самую тяжёлую корзину.
 */
export function dominantColor(src: CanvasImageSource): string {
  const n = 48;
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, n, n);
  const d = ctx.getImageData(0, 0, n, n).data;
  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max ? (max - min) / max : 0;
    const light = (max + min) / 510;
    const w = 0.3 + sat * 2 + (light > 0.08 && light < 0.92 ? 0.5 : 0);
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bk = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
    bk.w += w;
    bk.r += r * w;
    bk.g += g * w;
    bk.b += b * w;
    buckets.set(key, bk);
  }
  let best = { w: 0, r: 0, g: 0, b: 0 };
  for (const bk of buckets.values()) if (bk.w > best.w) best = bk;
  if (!best.w) return "";
  const hex = (v: number) => Math.round(v / best.w).toString(16).padStart(2, "0");
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`;
}

/** Светлый ли цвет (тогда поверх него нужен тёмный текст). */
export function isLight(hex: string): boolean {
  const v = parseInt(hex.slice(1), 16);
  const ch = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => {
    const c = x / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2] > 0.45;
}

export async function dominantColorOfFile(file: File): Promise<string> {
  try {
    return dominantColor((await decodeImage(file)).src);
  } catch {
    return "";
  }
}

export const RU_TIMEZONES: [string, string][] = [
  ["Europe/Kaliningrad", "Калининград (МСК−1)"],
  ["Europe/Moscow", "Москва (МСК)"],
  ["Europe/Samara", "Самара (МСК+1)"],
  ["Asia/Yekaterinburg", "Екатеринбург (МСК+2)"],
  ["Asia/Omsk", "Омск (МСК+3)"],
  ["Asia/Novosibirsk", "Новосибирск (МСК+4)"],
  ["Asia/Krasnoyarsk", "Красноярск (МСК+4)"],
  ["Asia/Irkutsk", "Иркутск (МСК+5)"],
  ["Asia/Yakutsk", "Якутск (МСК+6)"],
  ["Asia/Vladivostok", "Владивосток (МСК+7)"],
  ["Asia/Magadan", "Магадан (МСК+8)"],
  ["Asia/Kamchatka", "Камчатка (МСК+9)"],
  ["Asia/Almaty", "Алматы"],
  ["Asia/Tashkent", "Ташкент"],
  ["Europe/Minsk", "Минск"],
];

/** Палитра бизнеса от цвета баннера: фон — цвет баннера, остальное подбирается под контраст. */
export type Theme = { tone: string; light: boolean; vars: Record<string, string>; btn: string; btnText: string; glow?: import("./palette").Glow };

export function makeTheme(tone: string): Theme {
  const light = isLight(tone);
  const ink = light ? "#16181c" : "#ffffff";
  const btn = ink;
  const btnText = light ? "#ffffff" : tone;
  const a = (x: number) => (light ? `rgba(0,0,0,${x})` : `rgba(255,255,255,${x})`);
  const vars: Record<string, string> = {
    "--bg": tone,
    "--card": light ? `color-mix(in srgb, ${tone} 45%, #ffffff)` : `color-mix(in srgb, ${tone} 85%, #ffffff)`,
    "--text": ink,
    "--sub": a(light ? 0.62 : 0.78),
    "--hint": a(light ? 0.56 : 0.68),
    "--head": a(light ? 0.6 : 0.75),
    "--link": ink,
    "--btn": btn,
    "--btn-text": btnText,
    "--accent": btn,
    "--accent-text": btnText,
    "--sep": a(light ? 0.12 : 0.18),
    "--soft": light ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.14)",
    "--tile": light ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.14)",
    "--tile-press": light ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.24)",
    "--cta-bg": btn,
    "--cta-text": btnText,
    "--switch-on": "#34c759",
  };
  return { tone, light, vars, btn, btnText };
}

const THEME_KEYS = [...Object.keys(makeTheme("#808080").vars), "--glow-a", "--glow-b", "--glow-c", "--grain", "--surface", "--cta-bg2", "--tab-on"];

/** Применить палитру ко всему приложению (null — вернуть тему Telegram). */
export function applyTheme(theme: Theme | null, accent?: string) {
  const st = document.documentElement.style;
  for (const k of THEME_KEYS) st.removeProperty(k);
  if (theme) for (const [k, v] of Object.entries(theme.vars)) st.setProperty(k, v);
  else st.setProperty("--accent", accent || "var(--btn)");
  document.documentElement.classList.toggle("toned", !!theme);
  document.documentElement.classList.toggle("glow", !!theme?.glow);
  document.documentElement.classList.toggle("glow-dark", !!theme?.glow?.dark);
  try {
    WA?.setBackgroundColor?.(theme ? theme.tone : "secondary_bg_color");
    WA?.setHeaderColor?.(theme ? theme.tone : "secondary_bg_color");
  } catch {}
}

const toneCache = new Map<string, string>();

/** Цвет баннера: сохранённый при загрузке, а для старых баннеров — считаем по картинке (один раз). */
export function useBannerTone(biz: { id: number; settings: { bannerFileId?: string; bannerColor?: string } } | null | undefined): string {
  const url = biz ? bannerUrl(biz.id, biz.settings.bannerFileId) : "";
  const saved = biz?.settings.bannerColor || "";
  const [, bump] = useState(0);
  useEffect(() => {
    if (!url || saved || toneCache.has(url)) return;
    const img = new Image();
    img.onload = () => {
      try {
        toneCache.set(url, dominantColor(img));
      } catch {
        toneCache.set(url, "");
      }
      bump((x) => x + 1);
    };
    img.src = url;
  }, [url, saved]);
  if (!url) return "";
  return saved || toneCache.get(url) || "";
}

export const ThemeContext = createContext<Theme | null>(null);
export const useTheme = () => useContext(ThemeContext);

/**
 * Горизонтальные ленты (даты записи, лента работ) на компьютере: перетаскивание мышью с зажатой кнопкой
 * и прокрутка колёсиком. На телефоне ничего не меняет — там работает обычный свайп.
 * Один обработчик на весь документ, поэтому подхватывает и ленты, которые появятся позже.
 */
const DRAG_SCROLL = ".days, .home-works-row";

export function enableDragScroll() {
  let el: HTMLElement | null = null;
  let startX = 0;
  let startLeft = 0;
  let moved = false;

  document.addEventListener("pointerdown", (e) => {
    moved = false;
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const t = (e.target as HTMLElement).closest<HTMLElement>(DRAG_SCROLL);
    if (!t || t.scrollWidth <= t.clientWidth) return;
    el = t;
    startX = e.clientX;
    startLeft = t.scrollLeft;
    moved = false;
  });

  document.addEventListener("pointermove", (e) => {
    if (!el) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) < 5) return;
    if (!moved) {
      moved = true;
      el.classList.add("dragging"); // на время перетаскивания: без «прилипания» и выделения текста
    }
    el.scrollLeft = startLeft - dx;
    e.preventDefault();
  });

  const end = () => {
    if (!el) return;
    el.classList.remove("dragging");
    el = null;
    setTimeout(() => (moved = false), 0); // клик после отпускания уже обработан
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);

  // после перетаскивания не считать отпускание кнопки нажатием на дату или фото
  document.addEventListener(
    "click",
    (e) => {
      if (!moved) return;
      moved = false;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

  // колёсико мыши над лентой листает её вбок
  document.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const t = (e.target as HTMLElement).closest<HTMLElement>(DRAG_SCROLL);
      if (!t || t.scrollWidth <= t.clientWidth) return;
      const max = t.scrollWidth - t.clientWidth;
      if ((e.deltaY < 0 && t.scrollLeft <= 0) || (e.deltaY > 0 && t.scrollLeft >= max - 1)) return;
      t.scrollLeft += e.deltaY;
      e.preventDefault();
    },
    { passive: false },
  );
}
