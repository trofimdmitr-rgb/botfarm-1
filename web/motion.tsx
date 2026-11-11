// Движение страницы клиента: живой фон на весь экран (переливающиеся пятна + узор палитры с параллаксом),
// переход между экранами через затемнение и свайп влево/вправо между вкладками.
// Всё на transform/opacity — дёшево даже на простых телефонах; при «уменьшить движение» — без параллакса и сдвигов.
import { type ReactNode, useEffect, useRef, useState } from "react";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Фон за экранами клиента: 5 пятен цвета палитры плывут по всему экрану; узор едет при прокрутке медленнее текста. */
export function LiveBackground() {
  const aurora = useRef<HTMLDivElement>(null);
  const pattern = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced()) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (pattern.current) pattern.current.style.transform = `translate3d(0, ${-Math.min(y * 0.3, 2400)}px, 0)`;
        if (aurora.current) aurora.current.style.transform = `translate3d(0, ${-Math.min(y * 0.12, 600)}px, 0)`;
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="g-light" aria-hidden>
      <div className="g-aurora" ref={aurora}>
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="g-pattern" ref={pattern} />
    </div>
  );
}

/**
 * Экран с переходом через затемнение и свайпом между вкладками.
 * Свайп: горизонтальный, ≥70 px, не с края (там «назад» системы) и не по каруселям/полям.
 */
export function Screen(p: {
  routeKey: string;
  children: ReactNode;
  glow: boolean;
  swipe?: { prev: (() => void) | null; next: (() => void) | null };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; t: number; locked: "x" | "y" | null } | null>(null);
  const [enter, setEnter] = useState<"" | "left" | "right">(() => (sessionStorageGet("g-swipe") as any) || "");
  useEffect(() => {
    sessionStorageSet("g-swipe", "");
    const t = setTimeout(() => setEnter(""), 600);
    return () => clearTimeout(t);
  }, []);

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform .25s ease, opacity .25s ease";
    el.style.transform = "";
    el.style.opacity = "";
    setTimeout(() => el && (el.style.transition = ""), 260);
  };

  const handlers = p.swipe
    ? {
        onTouchStart: (e: React.TouchEvent) => {
          const t = e.touches[0];
          const target = e.target as HTMLElement;
          if (e.touches.length > 1 || t.clientX < 24 || t.clientX > window.innerWidth - 24) return;
          if (target.closest(".home-works-row, .days, .lightbox, input, textarea, select, .g-noswipe")) return;
          start.current = { x: t.clientX, y: t.clientY, t: Date.now(), locked: null };
        },
        onTouchMove: (e: React.TouchEvent) => {
          const s = start.current;
          if (!s) return;
          const t = e.touches[0];
          const dx = t.clientX - s.x, dy = t.clientY - s.y;
          if (!s.locked && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) s.locked = Math.abs(dx) > Math.abs(dy) * 1.5 ? "x" : "y";
          if (s.locked !== "x" || reduced()) return;
          const can = dx < 0 ? p.swipe!.next : p.swipe!.prev;
          const k = can ? 0.35 : 0.08; // в конце ряда вкладок — тугое сопротивление
          if (ref.current) {
            ref.current.style.transform = `translate3d(${dx * k}px, 0, 0)`;
            ref.current.style.opacity = String(1 - Math.min(Math.abs(dx) / 900, 0.25));
          }
        },
        onTouchEnd: (e: React.TouchEvent) => {
          const s = start.current;
          start.current = null;
          if (!s || s.locked !== "x") return reset();
          const dx = e.changedTouches[0].clientX - s.x;
          const go = dx < 0 ? p.swipe!.next : p.swipe!.prev;
          if (Math.abs(dx) >= 70 && go) {
            sessionStorageSet("g-swipe", dx < 0 ? "right" : "left");
            go();
          } else reset();
        },
      }
    : {};

  return (
    <>
      <div ref={ref} className={`screen ${enter ? `g-enter-${enter}` : ""}`} {...handlers}>
        {p.children}
      </div>
      {/* затемнение: новый экран проявляется из темноты */}
      {p.glow && <div key={`veil:${p.routeKey}`} className="g-veil" aria-hidden />}
    </>
  );
}

function sessionStorageGet(k: string) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function sessionStorageSet(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v);
  } catch {}
}
