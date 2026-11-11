import { StrictMode, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AdminPanel } from "./admin";
import { BookFlow, BusinessHome, ClientTabBar, type ClientTab, MyBookings, PortfolioScreen } from "./client";
import { api, applyTheme, enableDragScroll, ensureDevAuth, inMax, inTelegram, ThemeContext, urlParams, useBannerTone, WA } from "./lib";
import { LiveBackground, Screen } from "./motion";
import { glowFor, glowTheme } from "./palette";
import { Landing, SuperPanel } from "./platform";
import type { Boot } from "./types";
import { ErrorBox, Spinner } from "./ui";
// Один шрифт — Golos Text (ParaType), как пара YS Display/YS Text у Яндекса: заголовки 900 плотно, текст 400–500.
// Встроен в сборку (кириллица + латиница), браузер качает только нужные начертания.
import "@fontsource/golos-text/cyrillic-400.css";
import "@fontsource/golos-text/latin-400.css";
import "@fontsource/golos-text/cyrillic-500.css";
import "@fontsource/golos-text/latin-500.css";
import "@fontsource/golos-text/cyrillic-700.css";
import "@fontsource/golos-text/latin-700.css";
import "@fontsource/golos-text/cyrillic-900.css";
import "@fontsource/golos-text/latin-900.css";
import "./styles.css";

type Route =
  | { name: "home" }
  | { name: "book"; serviceId?: number; n?: number }
  | { name: "my" }
  | { name: "portfolio"; open?: number }
  | { name: "admin"; businessId: number }
  | { name: "super" };

type ThemeBiz = { id: number; settings: { accent?: string; bannerFileId?: string; bannerColor?: string; palette?: string; paletteMode?: string } };

function initialRoute(boot: Boot): Route {
  const view = urlParams.get("view");
  if (view === "super" && boot.me.isSuper) return { name: "super" };
  if (view === "admin" && boot.business && boot.role) return { name: "admin", businessId: boot.business.id };
  if (view === "my" && boot.business) return { name: "my" };
  return { name: "home" };
}

function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stack, setStack] = useState<Route[]>([]);
  // бизнес, открытый в панели управления (его цвет баннера красит панель)
  const [adminBiz, setAdminBiz] = useState<ThemeBiz | null>(null);

  const load = async (opts: { slug?: string; businessId?: number } = {}) => {
    setError(null);
    try {
      await ensureDevAuth();
      const b = await api<Boot>("boot", { slug: opts.slug ?? urlParams.get("b") ?? undefined, businessId: opts.businessId });
      setBoot(b);
      return b;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  useEffect(() => {
    WA?.ready();
    WA?.expand();
    load().then((b) => b && setStack([initialRoute(b)]));
  }, []);

  // Цвет баннера красит все экраны бизнеса: главную, запись, портфолио, «Мои записи» и панель мастера
  const route0 = stack[stack.length - 1];
  const themeBiz: ThemeBiz | null =
    !route0 || route0.name === "super"
      ? null
      : route0.name === "admin"
        ? adminBiz && adminBiz.id === route0.businessId
          ? adminBiz
          : null
        : (boot?.business ?? null);
  // палитра «свечения», которую выбрал мастер (по умолчанию — розовая); «из обложки» — от цвета баннера
  const tone = useBannerTone(themeBiz?.settings.palette === "banner" ? themeBiz : null);
  const palette = themeBiz ? themeBiz.settings.palette || "rose" : "";
  const mode = themeBiz?.settings.paletteMode || "dark";
  const theme = useMemo(() => (palette ? glowTheme(glowFor(palette, mode, tone)) : null), [palette, mode, tone]);
  useLayoutEffect(() => applyTheme(theme, themeBiz?.settings.accent), [theme, themeBiz?.settings.accent]);

  if (error) return <ErrorBox error={error} onRetry={() => load().then((b) => b && setStack([initialRoute(b)]))} />;
  if (!boot || !stack.length) return <Spinner />;

  const route = stack[stack.length - 1];
  const push = (r: Route) => {
    window.scrollTo(0, 0);
    setStack((s) => [...s, r]);
  };
  const pop = stack.length > 1 ? () => setStack((s) => s.slice(0, -1)) : null;
  const home = () => setStack([{ name: "home" }]);
  const biz = boot.business;

  // нижняя панель клиента — на главной, работах, записи и «Моих записях»
  const clientTab: ClientTab | null = ["home", "portfolio", "book", "my"].includes(route.name) ? (route.name as ClientTab) : null;
  const goTab = (t: ClientTab) => {
    window.scrollTo(0, 0);
    if (t === "home") {
      setStack([{ name: "home" }]);
      if (biz) load({ slug: biz.slug }); // обновить «Ближайшую запись»
    } else setStack([{ name: "home" }, t === "book" ? { name: "book", n: Date.now() } : { name: t }]);
  };
  const showTabs = !!biz && !!clientTab;
  // свайп влево/вправо между вкладками клиента — в том же порядке, что на нижней панели
  const tabOrder: ClientTab[] = biz ? ["home", ...(biz.portfolio.length ? (["portfolio"] as ClientTab[]) : []), "book", "my"] : [];
  const tabIdx = clientTab ? tabOrder.indexOf(clientTab) : -1;
  const swipe =
    showTabs
      ? {
          prev: tabIdx > 0 ? () => goTab(tabOrder[tabIdx - 1]) : null,
          next: tabIdx >= 0 && tabIdx < tabOrder.length - 1 ? () => goTab(tabOrder[tabIdx + 1]) : null,
        }
      : undefined;
  const routeKey = `${stack.length}:${JSON.stringify(route)}`;

  return (
    <ThemeContext.Provider value={theme}>
      {/* ключ по маршруту: при переходе экран монтируется заново и проигрывает появление */}
      <Screen key={routeKey} routeKey={routeKey} glow={!!theme?.glow && showTabs} swipe={swipe}>
        {screen(boot)}
      </Screen>
      {/* закреплённый мягкий переход под шапкой Telegram: при прокрутке содержимое уходит в цвет шапки без шва */}
      {theme && <div className="top-fade" aria-hidden />}
      {/* мягкий свет и зерно за экранами клиента (в панели мастера — спокойный фон без них) */}
      {theme && showTabs && <LiveBackground />}
      {showTabs && <ClientTabBar active={clientTab} hasWorks={biz.portfolio.length > 0} onGo={goTab} />}
    </ThemeContext.Provider>
  );

  function screen(boot: Boot) {
  switch (route.name) {
    case "super":
      return <SuperPanel boot={boot} onBack={pop} onAdmin={(id) => push({ name: "admin", businessId: id })} />;
    case "admin":
      return (
        <AdminPanel
          key={route.businessId}
          businessId={route.businessId}
          onBack={pop}
          onTheme={setAdminBiz}
          onPreview={async () => {
            const b = await load({ businessId: route.businessId });
            if (b?.business) push({ name: "home" });
          }}
        />
      );
    case "book":
      if (!biz) return null;
      return <BookFlow key={JSON.stringify(route)} boot={boot} serviceId={route.serviceId} onBack={pop ?? home} onMy={() => setStack([{ name: "home" }, { name: "my" }])} />;
    case "portfolio":
      if (!biz) return null;
      return <PortfolioScreen boot={boot} onBack={pop ?? home} open={route.open} />;
    case "my":
      if (!biz) return null;
      return <MyBookings boot={boot} onBack={pop ?? home} onBook={() => push({ name: "book" })} />;
    case "home":
    default:
      if (!biz) {
        return (
          <Landing
            boot={boot}
            onAdmin={(id) => push({ name: "admin", businessId: id })}
            onSuper={() => push({ name: "super" })}
          />
        );
      }
      return (
        <BusinessHome
          boot={boot}
          onBook={(serviceId) => push({ name: "book", serviceId })}
          onMy={() => push({ name: "my" })}
          onPortfolio={(open) => push({ name: "portfolio", open })}
          onAdmin={boot.role ? () => push({ name: "admin", businessId: biz.id }) : undefined}
          onSuper={boot.me.isSuper ? () => push({ name: "super" }) : undefined}
          onSwitch={async (slug) => {
            window.scrollTo(0, 0);
            const b = await load({ slug });
            if (b?.business) setStack([{ name: "home" }]);
          }}
        />
      );
  }
  }
}

if (inTelegram) document.documentElement.classList.add("tg");
if (inMax) document.documentElement.classList.add("max");
enableDragScroll();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
