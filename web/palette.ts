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
  pattern: Pattern; // тихий узор по всему фону (едет при прокрутке медленнее текста)
  patternColor: string;
  lightOnly?: boolean; // светлые палитры из референсов: режим «Тёмная» к ним не применяется
}

export type Pattern = "none" | "checker" | "stars" | "dots" | "waves" | "sparkles";

/** Светлые палитры по референсам Антона (11.11): пастель, свой узор, своя кнопка. Всегда светлые. */
export interface Pastel {
  id: string;
  label: string;
  note: string; // откуда палитра — для подсказки в настройках
  bg: string;
  ink: string;
  sub: string;
  a: string;
  b: string;
  c: string;
  cta: string;
  cta2: string;
  pattern: Pattern;
  patternColor: string;
}

export const PASTELS: Pastel[] = [
  { id: "meadow", label: "Луг", note: "розовый на траве", bg: "#e9eedb", ink: "#273013", sub: "#4c5733", a: "#f0a8e6", b: "#b8c98a", c: "#ffffff", cta: "#e98fd8", cta2: "#f2b0ea", pattern: "stars", patternColor: "#eba0df" },
  { id: "checker", label: "Клетка", note: "дофаминовая клетка", bg: "#fdfcf7", ink: "#1c1c1e", sub: "#4a4a52", a: "#b9d8f7", b: "#f1aed0", c: "#fbf3a8", cta: "#f1aed0", cta2: "#fbf3a8", pattern: "checker", patternColor: "#dceafb" },
  { id: "mintlilac", label: "Мята и сирень", note: "мята, сирень, стекло", bg: "#e4f3ee", ink: "#26332f", sub: "#46564f", a: "#c3b1ea", b: "#a7e2cd", c: "#f5f0ff", cta: "#b8a4ea", cta2: "#a7e2cd", pattern: "sparkles", patternColor: "#b9a6e6" },
  { id: "dustyrose", label: "Пыльная роза", note: "роза, бирюза, слоновая кость", bg: "#f3ebde", ink: "#3b2430", sub: "#6a4a57", a: "#c55a87", b: "#42979a", c: "#f6d6e2", cta: "#b84f7c", cta2: "#c8648f", pattern: "waves", patternColor: "#9cc9c9" },
  { id: "cranes", label: "Журавли", note: "серо-голубой с розой", bg: "#e8eef1", ink: "#1f3340", sub: "#44596a", a: "#80a9c6", b: "#be9ea4", c: "#90aa93", cta: "#527486", cta2: "#5f8193", pattern: "waves", patternColor: "#a9c3d6" },
  { id: "waves", label: "Волны", note: "пастельные волны", bg: "#eff0fb", ink: "#262b52", sub: "#4a5080", a: "#a9bde8", b: "#f2b6d0", c: "#b4ecd2", cta: "#5f6fcc", cta2: "#7c6fd4", pattern: "waves", patternColor: "#c4cff0" },
  { id: "peach", label: "Персик", note: "персик и сирень", bg: "#f8e4d8", ink: "#4a2a22", sub: "#74483c", a: "#f0a08a", b: "#c9b3dc", c: "#fff3e8", cta: "#f0a08a", cta2: "#f4b59f", pattern: "dots", patternColor: "#efb7a4" },
  { id: "tiger", label: "Тигр", note: "красный на сером", bg: "#ede7ea", ink: "#36262d", sub: "#5e4852", a: "#ec6b6b", b: "#f4a77d", c: "#b8c0dc", cta: "#d63a45", cta2: "#e0573f", pattern: "stars", patternColor: "#f0a0a0" },
  { id: "lemonade", label: "Лимонад", note: "лимон, роза, небо", bg: "#fffbe2", ink: "#2a2812", sub: "#57532c", a: "#f6e46a", b: "#f6a6c8", c: "#9ccbf2", cta: "#2a2812", cta2: "#4f4a22", pattern: "checker", patternColor: "#faf0a6" },
  { id: "sakura", label: "Сакура", note: "розовый, мята, абрикос", bg: "#fce9f0", ink: "#4a1f33", sub: "#74405a", a: "#f39cbf", b: "#a8e6cf", c: "#ffd9b0", cta: "#f39cbf", cta2: "#f7b5cf", pattern: "sparkles", patternColor: "#f3a9c8" },
];

export const BW_ID = "bw";

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

function fromPastel(p: Pastel): Glow {
  return {
    id: p.id, label: p.label, dark: false, bg: p.bg, ink: p.ink, sub: p.sub, a: p.a, b: p.b, c: p.c,
    cta: p.cta, cta2: p.cta2, ctaText: pickText([p.ink, "#ffffff"], [p.cta, p.cta2]), surface: mix(p.bg, 45, "#ffffff"),
    pattern: p.pattern, patternColor: p.patternColor, lightOnly: true,
  };
}

/** Чёрно-белая: в светлом режиме — белый фон и чёрный текст, в тёмном — наоборот. */
function bw(dark: boolean): Glow {
  return dark
    ? { id: BW_ID, label: "Ч/Б", dark: true, bg: "#0b0b0b", ink: "#ffffff", sub: "#a8a8a8", a: "#6a6a6a", b: "#2e2e2e", c: "#8c8c8c", cta: "#ffffff", cta2: "#c8c8c8", ctaText: "#0b0b0b", surface: "#171717", pattern: "dots", patternColor: "#2c2c2c" }
    : { id: BW_ID, label: "Ч/Б", dark: false, bg: "#f4f4f2", ink: "#111111", sub: "#4a4a4a", a: "#bdbdbd", b: "#e6e6e6", c: "#8a8a8a", cta: "#111111", cta2: "#3d3d3d", ctaText: "#ffffff", surface: "#ffffff", pattern: "dots", patternColor: "#d2d2d2" };
}

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
      pattern: "none",
      patternColor: "#000000",
    };
  }
  const { bg, ink, sub } = c.light;
  return { id: c.id, label: c.label, dark: false, bg, ink, sub, a, b: shade(a, 0.2), c: b, cta: ink, cta2: shade(ink, 0.12), ctaText: bg, surface: mix(bg, 45, "#ffffff"), pattern: "none", patternColor: "#000000" };
}

/** Какая палитра у бизнеса. tone — цвет обложки (для «из обложки»). */
export function glowFor(palette: string | undefined, mode: string | undefined, tone: string): Glow {
  const p = palette || "rose";
  const dark = mode !== "light";
  const preset = COLORS.find((g) => g.id === p);
  if (preset) return build(preset, dark);
  const pastel = PASTELS.find((g) => g.id === p);
  if (pastel) return fromPastel(pastel);
  if (p === BW_ID) return bw(dark);
  // «из обложки» и свой цвет: те же переливающиеся пятна плюс тихий узор-искры цвета палитры
  if (p === "banner" && tone) return withSparkles(build(colorFromHex(tone, "banner", "Из обложки"), dark));
  if (/^#[0-9a-f]{6}$/i.test(p)) return withSparkles(build(colorFromHex(p, p, "Свой цвет"), dark));
  return build(COLORS[0], dark);
}

function withSparkles(g: Glow): Glow {
  return { ...g, pattern: "sparkles", patternColor: g.dark ? hexMix(g.a, "#000000", 0.62) : hexMix(g.a, g.bg, 0.5) };
}

/** Смешать два #rrggbb (t — доля второго); узор рисуется SVG, там color-mix не работает. */
function hexMix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (v: number, sh: number) => (v >> sh) & 255;
  return "#" + [16, 8, 0].map((sh) => Math.round(ch(pa, sh) * (1 - t) + ch(pb, sh) * t).toString(16).padStart(2, "0")).join("");
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
    "--btn-text": g.dark ? DARK_BG : g.bg, // кнопка цвета текста — надпись цвета фона, никогда не сливается
    "--accent": g.dark ? g.a : g.ink,
    "--accent-text": g.dark ? DARK_BG : g.bg,
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
    "--shine": g.dark ? mix(g.a, 85, "#ffffff") : "#ffffff",
    "--pattern": patternImage(g.pattern, g.patternColor),
    "--pattern-size": PATTERN_SIZE[g.pattern],
    "--grain": `url(${grainTile(g.dark ? "#ffffff" : g.ink)})`,
  };
}

// ---------- узоры фона: клетка, звёзды-вспышки, точки, волны (сэйгайха), искры ----------

const PATTERN_SIZE: Record<Pattern, string> = { none: "1px 1px", checker: "72px 72px", stars: "260px 260px", dots: "28px 28px", waves: "56px 28px", sparkles: "180px 180px" };

const svg = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;

/** Звезда-вспышка с острыми лучами, как нарисованная от руки (референс с ягнятами). */
function star(cx: number, cy: number, r: number, rays: number, rot: number, color: string): string {
  const pts: string[] = [];
  for (let i = 0; i < rays * 2; i++) {
    const rr = i % 2 ? r * 0.22 : r * (0.8 + ((i * 37) % 5) / 12);
    const ang = (Math.PI * i) / rays + rot;
    pts.push(`${(cx + rr * Math.cos(ang)).toFixed(1)},${(cy + rr * Math.sin(ang)).toFixed(1)}`);
  }
  return `<polygon points='${pts.join(" ")}' fill='${color}'/>`;
}

function patternImage(kind: Pattern, color: string): string {
  switch (kind) {
    case "checker":
      return `repeating-conic-gradient(${color} 0 25%, transparent 0 50%)`;
    case "dots":
      return `radial-gradient(${color} 2.2px, transparent 2.8px)`;
    case "waves": {
      // сэйгайха — японские волны из полукругов
      const arcs = [22, 15, 8]
        .map((r) => `<path d='M${28 - r} 28 a${r} ${r} 0 0 1 ${r * 2} 0' fill='none' stroke='${color}' stroke-width='2'/>`)
        .join("");
      const half = [22, 15, 8]
        .map((r) => `<path d='M${-r} 14 a${r} ${r} 0 0 1 ${r * 2} 0 M${56 - r} 14 a${r} ${r} 0 0 1 ${r * 2} 0' fill='none' stroke='${color}' stroke-width='2'/>`)
        .join("");
      return svg(56, 28, half + arcs);
    }
    case "stars":
      return svg(260, 260, star(50, 60, 34, 8, 0.2, color) + star(190, 170, 26, 7, 0.9, color) + star(120, 230, 12, 6, 0.4, color));
    case "sparkles": {
      const sp = (x: number, y: number, r: number) =>
        `<path d='M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z' fill='${color}'/>`;
      return svg(180, 180, sp(40, 40, 12) + sp(130, 90, 8) + sp(70, 140, 6) + sp(160, 20, 5));
    }
    default:
      return "none";
  }
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

/** Из нескольких цветов текста — тот, у которого худший контраст с фонами кнопки выше. */
function pickText(texts: string[], bgs: string[]): string {
  let best = texts[0], score = -1;
  for (const t of texts) {
    const sc = Math.min(...bgs.map((b) => ratio(lum(b), lum(t))));
    if (sc > score) [best, score] = [t, sc];
  }
  return best;
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
  // нижняя кнопка Telegram — как «Записаться»: цвет кнопки палитры и подобранный к нему цвет надписи
  return { tone: g.bg, light: !g.dark, vars: glowVars(g), btn: g.cta, btnText: g.ctaText, glow: g };
}
