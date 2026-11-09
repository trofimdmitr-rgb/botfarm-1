// «Свечение» — палитры страницы мастера в стиле «Розовый свет»: пастельный фон, глубокий цвет текста
// и три мягких пятна света. Мастер выбирает готовую палитру, цвет из обложки или свой цвет.

export interface Glow {
  id: string;
  label: string;
  dark: boolean;
  bg: string; // фон страницы и шапки Telegram
  ink: string; // текст и кнопки
  sub: string; // вторичный текст (контраст ≥ 4.5 к фону)
  a: string; // яркое пятно света
  b: string; // светлое пятно
  c: string; // среднее пятно
  btnText: string; // текст на кнопке цвета ink
}

export const GLOWS: Glow[] = [
  { id: "rose", label: "Розовый", dark: false, bg: "#f9c6dc", ink: "#4a0f2e", sub: "#6e2049", a: "#ff4fa0", b: "#ffe3ef", c: "#ff86c0", btnText: "#ffe3ef" },
  { id: "lilac", label: "Сиреневый", dark: false, bg: "#dccbf7", ink: "#2a1352", sub: "#47307a", a: "#9a6bff", b: "#f3ecff", c: "#c2a3ff", btnText: "#f3ecff" },
  { id: "mint", label: "Мятный", dark: false, bg: "#c4ecdc", ink: "#0f3a2c", sub: "#1f5845", a: "#2fd39f", b: "#ecfff7", c: "#8ae0c0", btnText: "#ecfff7" },
  { id: "amber", label: "Янтарный", dark: false, bg: "#fbdcae", ink: "#4a2808", sub: "#6e4113", a: "#ff9a2e", b: "#fff3dc", c: "#ffc06e", btnText: "#fff3dc" },
  { id: "sky", label: "Небо", dark: false, bg: "#c8dcfa", ink: "#0f2650", sub: "#284476", a: "#4f8dff", b: "#eef4ff", c: "#8fb7ff", btnText: "#eef4ff" },
  { id: "graphite", label: "Графит", dark: true, bg: "#17131a", ink: "#f6eaf1", sub: "#cdb6c3", a: "#8a2a5c", b: "#2a2030", c: "#5a2a48", btnText: "#17131a" },
];

/** Палитра из любого цвета: тот же оттенок, светлый фон, глубокий текст. */
export function glowFromHex(hex: string, id = hex, label = "Свой цвет"): Glow {
  const [h, s0] = hsl(hex);
  const s = Math.max(0.18, Math.min(s0, 0.85)); // серый остаётся спокойным, кислотный — смягчается
  const c = (sat: number, l: number) => hslHex(h, sat, l);
  return {
    id,
    label,
    dark: false,
    bg: c(s, 0.86),
    ink: c(Math.min(1, s + 0.1), 0.15),
    sub: c(Math.min(1, s), 0.24),
    a: c(Math.min(1, s + 0.25), 0.64),
    b: c(Math.min(1, s + 0.1), 0.95),
    c: c(Math.min(1, s + 0.2), 0.78),
    btnText: c(Math.min(1, s + 0.1), 0.95),
  };
}

/** Какая палитра у бизнеса. tone — цвет обложки (для «из обложки»). */
export function glowFor(palette: string | undefined, tone: string): Glow {
  const p = palette || "rose";
  const preset = GLOWS.find((g) => g.id === p);
  if (preset) return preset;
  if (p === "banner") return tone ? glowFromHex(tone, "banner", "Из обложки") : GLOWS[0];
  if (/^#[0-9a-f]{6}$/i.test(p)) return glowFromHex(p);
  return GLOWS[0];
}

const mix = (c: string, pct: number, with_ = "transparent") => `color-mix(in srgb, ${c} ${pct}%, ${with_})`;

/** CSS-переменные приложения для палитры (совместимы с панелью мастера). */
export function glowVars(g: Glow): Record<string, string> {
  return {
    "--bg": g.bg,
    "--card": g.dark ? mix(g.bg, 86, "#ffffff") : mix(g.bg, 40, "#ffffff"),
    "--text": g.ink,
    "--sub": g.sub,
    "--hint": mix(g.sub, 88, g.bg),
    "--head": g.sub,
    "--link": g.ink,
    "--btn": g.ink,
    "--btn-text": g.btnText,
    "--accent": g.ink,
    "--accent-text": g.btnText,
    "--sep": mix(g.ink, 16),
    "--soft": g.dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.45)",
    "--tile": g.dark ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.42)",
    "--tile-press": g.dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.66)",
    "--cta-bg": g.ink,
    "--cta-text": g.btnText,
    "--switch-on": g.ink,
    "--glow-a": g.a,
    "--glow-b": g.b,
    "--glow-c": g.c,
    "--glow-d": shiftHue(g.a, g.dark ? 50 : 38),
    "--grain": `url(${grainTile(g.dark ? "#ffffff" : g.ink)})`,
  };
}

// ---------- зерно: маленькая плитка шума, рисуется один раз на цвет ----------

const grainCache = new Map<string, string>();
function grainTile(color: string): string {
  const hit = grainCache.get(color);
  if (hit) return hit;
  let url = "";
  try {
    const n = 140;
    const cv = document.createElement("canvas");
    cv.width = n;
    cv.height = n;
    const ctx = cv.getContext("2d")!;
    const img = ctx.createImageData(n, n);
    const v = parseInt(color.slice(1), 16);
    const [r, gg, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = r;
      img.data[i + 1] = gg;
      img.data[i + 2] = b;
      img.data[i + 3] = rnd() < 0.55 ? 0 : Math.round(rnd() * 30);
    }
    ctx.putImageData(img, 0, 0);
    url = cv.toDataURL("image/png");
  } catch {}
  grainCache.set(color, url);
  return url;
}

// ---------- цвет ----------

/** Тот же цвет со сдвигом оттенка — второй цвет переливания света (розовый уходит в коралловый/сиреневый и т.д.). */
function shiftHue(hex: string, deg: number): string {
  const [h, s, l] = hsl(hex);
  return hslHex((h + deg + 360) % 360, Math.min(1, s), l);
}

function hsl(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  const r = ((v >> 16) & 255) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

/** Тема приложения из палитры (тот же формат, что у темы от баннера). */
export function glowTheme(g: Glow): import("./lib").Theme {
  return { tone: g.bg, light: !g.dark, vars: glowVars(g), btn: g.ink, btnText: g.btnText, glow: g };
}
