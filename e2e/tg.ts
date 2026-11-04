// Имитация Telegram для автотестов: подписанный initData, темы, платформы, MainButton/BackButton, диалоги.
// Скрипт подставляется в страницу до загрузки приложения, а настоящий telegram-web-app.js глушится.
import { createHmac } from "node:crypto";
import type { Page } from "@playwright/test";

export const BOT_TOKEN = "100000:LOCAL_DEV_TOKEN"; // как в dev/local-server.ts
export const BASE = "http://localhost:8787";

export type Theme = "light" | "dark";
export type Platform = "ios" | "android" | "tdesktop";

/** Цвета темы, как их отдаёт Telegram (iOS по умолчанию). */
export const THEMES: Record<Theme, Record<string, string>> = {
  light: {
    bg_color: "#ffffff",
    secondary_bg_color: "#efeff4",
    section_bg_color: "#ffffff",
    text_color: "#000000",
    hint_color: "#8e8e93",
    subtitle_text_color: "#8e8e93",
    link_color: "#007aff",
    button_color: "#007aff",
    button_text_color: "#ffffff",
    section_header_text_color: "#6d6d72",
    destructive_text_color: "#ff3b30",
    header_bg_color: "#f8f8f8",
  },
  dark: {
    bg_color: "#000000",
    secondary_bg_color: "#1c1c1d",
    section_bg_color: "#2c2c2e",
    text_color: "#ffffff",
    hint_color: "#98989e",
    subtitle_text_color: "#98989e",
    link_color: "#3e88f7",
    button_color: "#3e88f7",
    button_text_color: "#ffffff",
    section_header_text_color: "#8d8e93",
    destructive_text_color: "#eb5545",
    header_bg_color: "#1a1a1a",
  },
};

export function signInitData(userId: number, startParam = ""): { raw: string; user: Record<string, unknown> } {
  const user = { id: userId, first_name: userId === 1 ? "Антон" : userId === 2 ? "Анна" : `Гость ${userId}`, language_code: "ru", allows_write_to_pm: true };
  const fields: Record<string, string> = { auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user) };
  if (startParam) fields.start_param = startParam;
  const check = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secret).update(check).digest("hex");
  return { raw: new URLSearchParams({ ...fields, hash }).toString(), user };
}

/** Код, который выполняется в странице до приложения и изображает window.Telegram.WebApp. */
function mockScript(o: { initData: string; user: Record<string, unknown>; startParam: string; theme: Theme; platform: Platform }) {
  const theme = THEMES[o.theme];
  return `(() => {
    const state = { main: { visible: false, active: true, text: "", color: "", textColor: "", progress: false }, back: false, alerts: [], confirms: [], links: [], header: "", bg: "" };
    const mainHandlers = new Set(), backHandlers = new Set();
    const theme = ${JSON.stringify(theme)};
    const applyTheme = () => { const root = document.documentElement; if (!root) return; for (const [k, v] of Object.entries(theme)) root.style.setProperty("--tg-theme-" + k.replace(/_/g, "-"), v); };
    applyTheme(); document.addEventListener("DOMContentLoaded", applyTheme);
    const MainButton = {
      get isVisible() { return state.main.visible; }, get text() { return state.main.text; }, get isActive() { return state.main.active; },
      setParams(p) {
        if ("text" in p) state.main.text = p.text; if ("is_visible" in p) state.main.visible = !!p.is_visible;
        if ("is_active" in p) state.main.active = !!p.is_active; if ("color" in p) state.main.color = p.color;
        if ("text_color" in p) state.main.textColor = p.text_color; return MainButton;
      },
      setText(t) { state.main.text = t; return MainButton; }, show() { state.main.visible = true; return MainButton; }, hide() { state.main.visible = false; return MainButton; },
      enable() { state.main.active = true; return MainButton; }, disable() { state.main.active = false; return MainButton; },
      showProgress() { state.main.progress = true; return MainButton; }, hideProgress() { state.main.progress = false; return MainButton; },
      onClick(h) { mainHandlers.add(h); return MainButton; }, offClick(h) { mainHandlers.delete(h); return MainButton; },
    };
    const BackButton = {
      get isVisible() { return state.back; }, show() { state.back = true; return BackButton; }, hide() { state.back = false; return BackButton; },
      onClick(h) { backHandlers.add(h); return BackButton; }, offClick(h) { backHandlers.delete(h); return BackButton; },
    };
    window.__tg = {
      state,
      clickMain() { if (!state.main.visible || !state.main.active) return false; mainHandlers.forEach((h) => h()); return true; },
      clickBack() { if (!state.back) return false; backHandlers.forEach((h) => h()); return true; },
    };
    window.Telegram = { WebApp: {
      initData: ${JSON.stringify(o.initData)},
      initDataUnsafe: { user: ${JSON.stringify(o.user)}, start_param: ${JSON.stringify(o.startParam || undefined)}, auth_date: Math.floor(Date.now() / 1000) },
      version: "8.0", platform: ${JSON.stringify(o.platform)}, colorScheme: ${JSON.stringify(o.theme)}, themeParams: theme,
      isExpanded: true, viewportHeight: innerHeight, viewportStableHeight: innerHeight,
      safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 }, contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      isVersionAtLeast(v) { return parseFloat(v) <= 8.0; },
      ready() {}, expand() {}, close() {}, onEvent() {}, offEvent() {}, enableClosingConfirmation() {}, disableVerticalSwipes() {},
      setHeaderColor(c) { state.header = c; }, setBackgroundColor(c) { state.bg = c; }, setBottomBarColor() {},
      HapticFeedback: { impactOccurred() {}, notificationOccurred() {}, selectionChanged() {} },
      MainButton, BackButton,
      SecondaryButton: { setParams() {}, show() {}, hide() {}, onClick() {}, offClick() {} },
      showAlert(t, cb) { state.alerts.push(t); setTimeout(() => cb && cb(), 0); },
      showConfirm(t, cb) { state.confirms.push(t); setTimeout(() => cb && cb(true), 0); },
      showPopup(p, cb) { state.alerts.push(p.message); setTimeout(() => cb && cb("ok"), 0); },
      openLink(u) { state.links.push(u); }, openTelegramLink(u) { state.links.push(u); },
      requestWriteAccess(cb) { setTimeout(() => cb && cb(true), 0); },
      requestContact(cb) { setTimeout(() => cb && cb(true, { responseUnsafe: { contact: { phone_number: "79271234567" } } }), 0); },
    } };
  })();`;
}

export type Opened = { errors: string[]; viewport: { width: number; height: number } };

/**
 * Открыть мини-апп «как в Telegram»: user — кто открывает, slug — ссылка бизнеса, view — экран (admin/my/super).
 */
export async function openInTelegram(
  page: Page,
  o: { user: number; slug?: string; view?: string; theme?: Theme; platform?: Platform },
): Promise<Opened> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource.*(telegram|fonts)/i.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  // настоящий скрипт Telegram не грузим — он бы перезаписал имитацию
  await page.route("https://telegram.org/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  const { raw, user } = signInitData(o.user, o.slug ?? "");
  await page.addInitScript(mockScript({ initData: raw, user, startParam: o.slug ?? "", theme: o.theme ?? "light", platform: o.platform ?? "ios" }));
  const q = new URLSearchParams();
  if (o.slug) q.set("b", o.slug);
  if (o.view) q.set("view", o.view);
  await page.goto(`${BASE}/?${q}`);
  await page.waitForSelector(".page", { timeout: 15_000 });
  await settle(page);
  return { errors, viewport: page.viewportSize()! };
}

/** Дождаться конца анимаций и сети. */
export async function settle(page: Page, ms = 900) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
}

export const tg = {
  // в MAX имитации Telegram нет — считаем, что нативной кнопки нет
  state: (page: Page) => page.evaluate(() => (window as any).__tg?.state ?? { main: { visible: false, text: "" }, back: false, alerts: [], confirms: [] }),
  clickMain: (page: Page) => page.evaluate(() => (window as any).__tg.clickMain()),
  clickBack: (page: Page) => page.evaluate(() => (window as any).__tg.clickBack()),
};

// ---------- MAX ----------
export const MAX_TOKEN = "max-local-token"; // как в dev/local-server.ts

export function signMaxInitData(maxUserId: number, startParam = ""): string {
  const fields: Record<string, string> = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "e2e",
    user: JSON.stringify({ id: maxUserId, first_name: "Ира", last_name: "", username: "ira", language_code: "ru", photo_url: "" }),
    chat: JSON.stringify({ id: 1, type: "DIALOG" }),
  };
  if (startParam) fields.start_param = startParam;
  const check = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(MAX_TOKEN).digest();
  return new URLSearchParams({ ...fields, hash: createHmac("sha256", secret).update(check).digest("hex") }).toString();
}

/** Открыть мини-апп «как в MAX»: мост window.WebApp, параметр запуска «slug__view», без темы и без нижней кнопки. */
export async function openInMax(page: Page, o: { maxUser: number; start: string }): Promise<Opened> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource/i.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  await page.route("https://telegram.org/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await page.route("https://st.max.ru/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  const initData = signMaxInitData(o.maxUser, o.start);
  const [b, view] = o.start.split("__");
  await page.addInitScript(`(() => {
    const state = { back: false, shared: [], links: [] }; const backHandlers = new Set();
    window.__max = { state, clickBack() { if (!state.back) return false; backHandlers.forEach((h) => h()); return true; } };
    window.WebApp = {
      initData: ${JSON.stringify(initData)},
      initDataUnsafe: { user: { id: ${o.maxUser}, first_name: "Ира" }, start_param: ${JSON.stringify(o.start)}, chat: { id: 1, type: "DIALOG" } },
      platform: "android", version: "26.1.0",
      BackButton: { get isVisible() { return state.back; }, show() { state.back = true; }, hide() { state.back = false; }, onClick(h) { backHandlers.add(h); }, offClick(h) { backHandlers.delete(h); } },
      HapticFeedback: { impactOccurred() {}, notificationOccurred() {}, selectionChanged() {} },
      openLink(u) { state.links.push(u); }, openMaxLink(u) { state.links.push(u); },
      shareMaxContent(p) { state.shared.push(p); },
      requestContact() { return Promise.resolve({ phone: "+79271234567", authDate: "0", hash: "x" }); },
    };
  })();`);
  void b;
  void view;
  await page.goto(`${BASE}/?max=1`);
  await page.waitForSelector(".page", { timeout: 15_000 });
  await settle(page);
  return { errors, viewport: page.viewportSize()! };
}

export const max = {
  state: (page: Page) => page.evaluate(() => (window as any).__max.state),
  clickBack: (page: Page) => page.evaluate(() => (window as any).__max.clickBack()),
};
