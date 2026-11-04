// Проверки вёрстки, которые ловят типичные баги мини-аппа в Telegram.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { settle, tg } from "./tg";

export type Problem = { kind: string; what: string };

/** Проверить текущий экран; screen — подпись для отчёта и имени скриншота. Найденное — мягкая ошибка теста. */
export async function checkScreen(page: Page, info: TestInfo, screen: string, errors: string[]) {
  const found = await findProblems(page, info, screen, errors);
  expect.soft(found, `экран «${screen}»`).toEqual([]);
  return found;
}

/** Найти проблемы вёрстки на текущем экране и приложить скриншот к отчёту. */
export async function findProblems(page: Page, info: TestInfo, screen: string, errors: string[]): Promise<Problem[]> {
  await settle(page, 500);
  const problems: Problem[] = errors.splice(0).map((e) => ({ kind: "ошибка в консоли", what: e }));

  // В Telegram нативная кнопка внизу уменьшает окно мини-аппа — повторяем это, чтобы видеть то же, что пользователь
  const st = await tg.state(page);
  const base = (page as any).__baseViewport ?? page.viewportSize()!;
  (page as any).__baseViewport = base;
  const wantH = st.main.visible ? base.height - 58 : base.height;
  if (page.viewportSize()!.height !== wantH) {
    await page.setViewportSize({ width: base.width, height: wantH });
    await page.waitForTimeout(250);
  }

  problems.push(
    ...(await page.evaluate(({ mainVisible, deviceWidth }) => {
      const out: { kind: string; what: string }[] = [];
      // ширина экрана устройства: на телефоне окно «растягивается» под широкий контент, поэтому innerWidth не годится
      const vw = deviceWidth;
      const name = (el: Element) => {
        const t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
        return `<${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""}>${t ? ` «${t}»` : ""}`;
      };
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
      };
      const inScroller = (el: Element) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true;
        }
        return false;
      };

      // 1. страница не должна ездить вбок
      if (document.documentElement.scrollWidth > vw + 1 || window.innerWidth > vw + 1) {
        out.push({ kind: "горизонтальная прокрутка", what: `ширина страницы ${document.documentElement.scrollWidth}px при окне ${vw}px` });
      }

      const all = Array.from(document.querySelectorAll("body *")).filter(visible);

      // 2. элементы, вылезающие за край экрана
      for (const el of all) {
        if (inScroller(el) || el.closest(".lightbox, .cover, .top-fade")) continue;
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1.5 || r.left < -1.5) out.push({ kind: "вылезает за край", what: `${name(el)} [${Math.round(r.left)}…${Math.round(r.right)}]` });
      }

      // 3. обрезанный текст в кнопках, вкладках, ценах (там, где многоточие не задумано)
      for (const el of all.filter((e) => e.matches("button, .btn, .tabbar-item span, .price-val, .day-n, .tab, .badge, .stat-n"))) {
        const cs = getComputedStyle(el);
        if (cs.textOverflow === "ellipsis") continue;
        const h = el as HTMLElement;
        if (h.scrollWidth > h.clientWidth + 2 && cs.overflowX !== "visible") out.push({ kind: "текст обрезан", what: name(el) });
      }

      // 4. нижняя панель и нативная кнопка одновременно — две полосы внизу
      const bar = document.querySelector(".tabbar");
      const barShown = bar && visible(bar);
      if (barShown && mainVisible) out.push({ kind: "две кнопки внизу", what: "нижняя панель и кнопка Telegram видны одновременно" });

      // 5. в самом низу страницы последнее содержимое не должно прятаться под фиксированными панелями
      const fixed = Array.from(document.querySelectorAll(".tabbar, .mainbtn-wrap")).filter(visible);
      if (fixed.length) {
        window.scrollTo(0, document.documentElement.scrollHeight);
        const top = Math.min(...fixed.map((f) => f.getBoundingClientRect().top));
        for (const el of Array.from(document.querySelectorAll(".page button, .page a, .page input, .page textarea, .page select, .page .home-foot")).filter(visible)) {
          if (fixed.some((f) => f.contains(el)) || inScroller(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.bottom > top + 2 && r.top < window.innerHeight) out.push({ kind: "закрыто нижней панелью", what: `${name(el)} (низ ${Math.round(r.bottom)}, панель с ${Math.round(top)})` });
        }
        window.scrollTo(0, 0);
      }

      // 7. контраст текста: читается ли текст на своём фоне (WCAG, порог 3:1 — мягкий, для подсказок тоже)
      const parse = (c: string): number[] | null => {
        let m = c.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
          return [p[0], p[1], p[2], p[3] ?? 1];
        }
        m = c.match(/color\(srgb ([^)]+)\)/);
        if (m) {
          const p = m[1].split(/[ /]+/).filter(Boolean).map(Number);
          return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1];
        }
        return null;
      };
      const over = (top: number[], bot: number[]) => {
        const a = top[3];
        return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1];
      };
      const lum = (c: number[]) => {
        const f = (v: number) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
      };
      const ratio = (a: number[], b: number[]) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
      };
      const bgOf = (el: Element) => {
        const chain: Element[] = [];
        for (let p: Element | null = el; p; p = p.parentElement) chain.unshift(p);
        let bg = [255, 255, 255, 1];
        for (const p of chain) {
          const c = parse(getComputedStyle(p).backgroundColor);
          if (c && c[3] > 0) bg = over(c, bg);
        }
        return bg;
      };
      const onPicture = (el: Element) => !!el.closest(".cover, .hero-cover, .lightbox, .gallery-item, .home-work, .banner-preview, .qr, .toast, .other-ava, .admin-emoji, .top-fade");
      for (const el of all) {
        if (onPicture(el)) continue;
        const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent || "").trim().length > 1);
        const isField = el.matches("input:not([type=checkbox]):not([type=radio]):not([type=color]), textarea");
        if (!own && !isField) continue;
        const cs = getComputedStyle(el);
        if (Number(cs.opacity) < 0.99) continue;
        const bg = bgOf(el);
        const fg = parse(cs.color);
        if (fg && ratio(over(fg, bg), bg) < 3) {
          out.push({ kind: "плохо читается", what: `${name(el)} (контраст ${ratio(over(fg, bg), bg).toFixed(1)}:1)` });
        }
        const h = el as HTMLInputElement;
        if (isField && h.placeholder && !h.value) {
          const pc = parse(getComputedStyle(el, "::placeholder").color);
          if (pc && ratio(over(pc, bg), bg) < 2.2) out.push({ kind: "плохо читается", what: `подсказка в поле «${h.placeholder.slice(0, 30)}» (контраст ${ratio(over(pc, bg), bg).toFixed(1)}:1)` });
        }
      }

      // 6. нажимаемые элементы не меньше 32px по высоте (палец)
      for (const el of all.filter((e) => e.matches(".tabbar-item, .btn:not(.btn-small), .price-row, .day, .slot, .cell-tap"))) {
        const r = el.getBoundingClientRect();
        if (r.height < 32) out.push({ kind: "слишком мелко для пальца", what: `${name(el)} (${Math.round(r.height)}px)` });
      }
      return out;
    }, { mainVisible: st.main.visible, deviceWidth: base.width })),
  );

  // скриншот экрана целиком — в отчёт
  const shot = await page.screenshot({ fullPage: true, animations: "disabled" });
  await info.attach(`${screen}.png`, { body: shot, contentType: "image/png" });
  // и в папку e2e-screens/<устройство>/<тема>/ — удобно листать все экраны разом
  const theme = info.titlePath.find((t) => t.startsWith("тема:"))?.replace("тема: ", "") ?? "light";
  const dir = join("e2e-screens", info.project.name, theme);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${screen.replace(/[\\/:*?"<>|]/g, "_")}.png`), shot);

  const uniq = Array.from(new Map(problems.map((p) => [p.kind + p.what, p])).values());
  if (uniq.length) {
    await info.attach(`${screen} — проблемы.txt`, { body: uniq.map((p) => `${p.kind}: ${p.what}`).join("\n"), contentType: "text/plain" });
  }
  return uniq;
}
