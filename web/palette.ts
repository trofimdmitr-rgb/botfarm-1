// Палитры страницы мастера. По умолчанию — тёмная, как Яндекс Музыка: почти чёрный фон и яркие текучие
// пятна цвета мастера. По выбору — светлая пастель. Мастер выбирает цвет (готовый, из обложки или свой) и режим.

export interface Glow {
  id: string;
  label: string;
  dark: boolean;
  bg: string; // фон страницы и шапки Telegram
  ink: string; // основной текст
  sub: string; // вторичный текст (контраст ≥ 4.5 к фону)
  a: string; // три цвета текучего пятна
  b: string;
  c: string;
  cta: string; // кнопка «Записаться»: перелив от cta к cta2
  cta2: string;
  ctaText: string;
  surface: string; // карточки и плашки
}

interface Color {
  id: string;
  label: string;
  vivid: [string, string, string]; // яркие цвета пятна
  light: { bg: string; ink: string; sub: string }; // светлая пастель
}

export const COLORS: Color[] = [
  { id: "rose", label: "Розовый", vivid: ["#ff2d87", "#ff8a3d", "#b13cff"], light: { bg: "#f9c6dc", ink: "#4a0f2e", sub: "#6e2049" } },
  { id: "lilac", label: "Сиреневый", vivid: ["#8b5cff", "#ff4fd8", "#4f7bff"], light: { bg: "#dccbf7", ink: "#2a1352", sub: "#47307a" } },
  { id: "mint", label: "Мятный", vivid: ["#19e0a0", "#2fb8ff", "#c6ff4a"], light: { bg: "#c4ecdc", ink: "#0f3a2c", sub: "#1f5845" } },
  { id: "amber", label: "Янтарный", vivid: ["#ffc21a", "#ff4a2e", "#ff2d87"], light: { bg: "#fbdcae", ink: "#4a2808", sub: "#6e4113" } },
  { id: "sky", label: "Небо", vivid: ["#3d8bff", "#31e1ff", "#8a5cff"], light: { bg: "#c8dcfa", ink: "#0f2650", sub: "#284476" } },
  { id: "graphite", label: "Графит", vivid: ["#e6e6ea", "#9a9aa3", "#5c5c66"], light: { bg: "#e4e4e8", ink: "#17171a", sub: "#45454c" } },
];

/** Цвет из любого #rrggbb: яркое пятно того же оттенка с соседями ±35°, пастель для светлого режима. */
function colorFromHex(hex: string, id: string, label: string): Color {
  const [h, s0] = hsl(hex);
  const s = Math.max(0.18, Math.min(s0, 0.9));
  const vs = Math.max(s, 0.75);
  return {
    id,
    label,
    vivid: [hslHex(h, vs, 0.58), hslHex((h + 35) % 360, vs, 0.6), hslHex((h + 325) % 360, vs, 0.55)],
    light: { bg: hslHex(h, s, 0.86), ink: hslHex(h, Math.min(1, s + 0.1), 0.15), sub: hslHex(h, s, 0.24) },
  };
}

const DARK_BG = "#0b0b0d";

function build(c: Color, dark: boolean): Glow {
  const [a, b, cc] = c.vivid;
  if (dark) {
    return {
      id: c.id,
      label: c.label,
      dark: true,
      bg: DARK_BG,
      ink: "#ffffff",
      sub: "#a9a9b2",
      a,
      b,
      c: cc,
      cta: a,
      cta2: b,
      ctaText: bestText(a, b),
      surface: "#17171b",
    };
  }
  const { bg, ink, sub } = c.light;
  return { id: c.id, label: c.label, dark: false, bg, ink, sub, a, b: shade(a, 0.2), c: b, cta: ink, cta2: shade(ink, 0.12), ctaText: bg, surface: mix(bg, 45, "#ffffff") };
}

/** Какая палитра у бизнеса. tone — цвет обложки (для «из обложки»). */
export function glowFor(palette: string | undefined, mode: string | undefined, tone: string): Glow {
  const p = palette || "rose";
  const dark = mode !== "light";
  const preset = COLORS.find((g) => g.id === p);
  if (preset) return build(preset, dark);
  if (p === "banner" && tone) return build(colorFromHex(tone, "banner", "Из обложки"), dark);
  if (/^#[0-9a-f]{6}$/i.test(p)) return build(colorFromHex(p, p, "Свой цвет"), dark);
  return build(COLORS[0], dark);
}

/** Превью цвета в настройках: три ярких цвета пятна. */
export const colorDots = (c: Color) => c.vivid;

function mix(c: string, pct: number, with_ = "transparent") {
  return `color-mix(in srgb, ${c} ${pct}%, ${with_})`;
}

/** CSS-переменные приложения для палитры (совместимы с панелью мастера). */
export function glowVars(g: Glow): Record<string, string> {
  return {
    "--bg": g.bg,
    "--card": g.dark ? g.surface : mix(g.bg, 40, "#ffffff"),
    "--text": g.ink,
    "--sub": g.sub,
    "--hint": g.dark ? "#8e8e98" : mix(g.sub, 88, g.bg),
    "--head": g.sub,
    "--link": g.dark ? g.a : g.ink,
    "--btn": g.dark ? "#ffffff" : g.ink,
    "--btn-text": g.dark ? DARK_BG : g.ctaText,
    "--accent": g.dark ? g.a : g.ink,
    "--accent-text": g.dark ? g.ctaText : g.ctaText,
    "--sep": g.dark ? "rgba(255,255,255,.1)" : mix(g.ink, 16),
    "--soft": g.dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.45)",
    "--tile": g.dark ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.42)",
    "--tile-press": g.dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.66)",
    "--surface": g.surface,
    "--cta-bg": g.cta,
    "--cta-bg2": g.cta2,
    "--cta-text": g.ctaText,
    "--switch-on": g.dark ? g.a : g.ink,
    "--tab-on": g.dark ? "#ffffff" : g.ink,
    "--glow-a": g.a,
    "--glow-b": g.b,
    "--glow-c": g.c,
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

function shade(hex: string, dl: number): string {
  const [h, s, l] = hsl(hex);
  return hslHex(h, Math.min(1, s + 0.05), Math.max(0.06, Math.min(0.94, l + dl)));
}

function lum(hex: string): number {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
    .map((x) => {
      const c = x / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
}
const ratio = (x: number, y: number) => (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);

/** Чёрный или белый текст на кнопке-переливе: берём тот, у которого контраст хуже всего выше. */
function bestText(...bgs: string[]): string {
  const black = Math.min(...bgs.map((b) => ratio(lum(b), lum(DARK_BG))));
  const white = Math.min(...bgs.map((b) => ratio(lum(b), 1)));
  return black >= white ? DARK_BG : "#ffffff";
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
  return { tone: g.bg, light: !g.dark, vars: glowVars(g), btn: g.dark ? g.cta : g.ink, btnText: g.ctaText, glow: g };
}
