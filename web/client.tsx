// Клиентская часть в духе Яндекс Музыки: тёмный фон (по умолчанию), текучее цветное пятно за крупным жирным именем,
// один шрифт Golos (900 — заголовки, 400–500 — текст), подборки с жирными заголовками, кнопка с медленным переливом.
// Все анимации тихие: только transform/opacity/background-position, при «уменьшить движение» выключаются.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  alertMsg,
  api,
  bannerUrl,
  confirmMsg,
  WA,
  dateOnly,
  duration,
  ensureWriteAccess,
  fmtDay,
  fmtTime,
  fmtWeekday,
  haptic,
  openLink,
  photoUrl,
  rub,
  shareLink,
  todayIn,
  inMax,
  MAXA,
} from "./lib";
import { checkPhone, maskPhone } from "../server/phone";
import type { Boot, Booking, Service, Slot } from "./types";
import { BackLink, Empty, ErrorBox, Field, Icon, MainButton, Spinner, useLoad } from "./ui";

type Biz = NonNullable<Boot["business"]>;

/** Сколько услуг показывать в прайсе на главной до «Все N». */
const PRICE_PREVIEW = 5;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Размер крупного имени: короткое — огромным, длинное — мельче, чтобы влезало в 2–3 строки. */
function nameSize(text: string): number {
  const longest = Math.max(...text.trim().split(/\s+/).map((w) => w.length));
  const n = text.trim().length;
  const byWord = longest <= 5 ? 76 : longest <= 7 ? 64 : longest <= 9 ? 54 : longest <= 12 ? 44 : 36;
  return Math.min(byWord, n <= 12 ? 76 : n <= 20 ? 60 : n <= 30 ? 48 : 38);
}

/** Фото проявляется плавно, когда загрузится (а не «выпрыгивает» по строкам). */
function FadeImg(p: { src: string; alt?: string; className?: string; lazy?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <img
      ref={(el) => {
        if (el?.complete && el.naturalWidth && !on) setOn(true);
      }}
      className={`g-fade ${on ? "is-on" : ""} ${p.className ?? ""}`}
      src={p.src}
      alt={p.alt ?? ""}
      loading={p.lazy ? "lazy" : undefined}
      onLoad={() => setOn(true)}
    />
  );
}

/** Заглушка на время загрузки: строки с мягким бликом в цветах страницы. */
function Skeleton({ rows = 3, kind = "rows" }: { rows?: number; kind?: "rows" | "slots" }) {
  return (
    <div className={`g-skel g-skel-${kind}`} aria-label="Загружаю…" role="status">
      {Array.from({ length: kind === "slots" ? rows * 3 : rows }, (_, i) => (
        <i key={i} style={{ animationDelay: `${i * 0.06}s` }} />
      ))}
    </div>
  );
}

/** Позвонить: tel: открывает звонилку; номер заодно копируется — если звонилка не открылась, его можно вставить. */
function CallRow({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <a
      className="g-row-i g-call"
      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
      onClick={() => {
        haptic();
        try {
          navigator.clipboard?.writeText(phone);
        } catch {}
        setTimeout(() => document.visibilityState === "visible" && setCopied(true), 1200);
      }}
    >
      <span className="g-call-ico">
        <Icon name="phone" size={18} />
      </span>
      <span className="g-row-i-main">
        <span className="g-call-label">{copied ? "Номер скопирован — можно вставить" : "Позвонить"}</span>
        <span className="g-call-num">{phone}</span>
      </span>
      <Icon name="arrow" size={16} />
    </a>
  );
}

/** Текучее пятно: три цветных эллипса медленно плывут и вращаются — форма как будто переливается. */
function Blob({ className = "" }: { className?: string }) {
  return (
    <div className={`g-blob ${className}`} aria-hidden>
      <i />
      <i />
      <i />
    </div>
  );
}

/** Блоки плавно проявляются при прокрутке (в автотестах и при «уменьшить движение» — сразу видны). */
function useReveal(dep: unknown) {
  useEffect(() => {
    if ((navigator as any).webdriver || !("IntersectionObserver" in window)) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".g-reveal:not(.g-in)"));
    const io = new IntersectionObserver(
      (list) => {
        for (const e of list) {
          if (e.isIntersecting) {
            e.target.classList.add("g-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => {
      el.classList.add("g-wait");
      io.observe(el);
    });
    return () => io.disconnect();
  }, [dep]);
}

/** Параллакс: обложка и пятно при прокрутке уезжают медленнее текста и мягко гаснут. */
function useParallax(ref: React.RefObject<HTMLDivElement | null>, blob: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.max(0, Math.min(window.scrollY, 700));
        if (ref.current) {
          ref.current.style.transform = `translate3d(0, ${y * 0.45}px, 0)`;
          ref.current.style.opacity = String(Math.max(0, 1 - y / 520));
        }
        if (blob.current) blob.current.style.transform = `translate3d(-50%, ${y * 0.25}px, 0)`;
      });
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, []);
}

/** Штрихкод из строки (номер записи, адрес страницы) — декоративный, но у каждого свой. */
function Barcode({ seed, height = 34 }: { seed: string; height?: number }) {
  const bars = useMemo(() => {
    const out: number[] = [];
    let h = 7;
    for (const ch of (seed + "·запись·").repeat(3)) {
      h = (h * 31 + ch.charCodeAt(0)) % 9973;
      out.push(1 + (h % 4));
      if (out.length >= 34) break;
    }
    return out;
  }, [seed]);
  return (
    <span className="g-barcode" style={{ height }} aria-hidden>
      {bars.map((w, i) => (
        <i key={i} style={{ width: w }} />
      ))}
    </span>
  );
}

/** Подпись дня для ближайшего окна: «сегодня», «завтра», «сб 14». */
function dayWord(day: string, tz: string): string {
  const today = todayIn(tz);
  if (day === today) return "сегодня";
  if (day === addDays(today, 1)) return "завтра";
  return `${fmtWeekday(dateOnly(day), "UTC")} ${Number(day.slice(8))}`;
}

// ближайшее свободное окно — кэш на минуту, чтобы переходы по вкладкам не дёргали сервер
const nearCache = new Map<number, { at: number; label: string }>();

function useNearest(b: Biz): string {
  const first = b.services[0]?.id;
  const cached = nearCache.get(b.id);
  const fresh = cached && Date.now() - cached.at < 60_000 ? cached.label : null;
  const [label, setLabel] = useState(fresh ?? cached?.label ?? "");
  useEffect(() => {
    if (!first) return;
    let alive = true;
    const load = () => {
      const c = nearCache.get(b.id);
      if (c && Date.now() - c.at < 60_000) return;
      api<Record<string, Slot[]>>("availability", { businessId: b.id, serviceId: first, staffId: null, days: 7 })
        .then((data) => {
          const day = Object.keys(data).find((d) => data[d].length);
          const v = day ? `${dayWord(day, b.timezone)} ${data[day][0].label}` : "";
          nearCache.set(b.id, { at: Date.now(), label: v });
          if (alive) setLabel(v);
        })
        .catch(() => {});
    };
    load();
    // окно «сегодня 10:00» живое: пока главная открыта — проверяем раз в минуту и при возвращении в приложение
    const t = window.setInterval(load, 60_000);
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      alive = false;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [b.id, first]);
  return label;
}

export function BusinessHome(p: {
  boot: Boot;
  onBook: (serviceId?: number) => void;
  onMy: () => void;
  onPortfolio: (open?: number) => void;
  onAdmin?: () => void;
  onSuper?: () => void;
  onSwitch?: (slug: string) => void;
}) {
  const b = p.boot.business!;
  const s = b.settings;
  const tz = b.timezone;
  const banner = bannerUrl(b.id, s.bannerFileId);
  const [allPrices, setAllPrices] = useState(false);
  const nearest = useNearest(b);
  const open = b.services.length > 0;
  const coverRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  useParallax(coverRef, blobRef);
  useReveal(allPrices);
  const next = p.boot.next;

  return (
    <div className={`page g-page g-home ${banner ? "g-has-cover" : ""}`}>
      {/* обложка — фон шапки за текстом: в кадре середина фото, ниже размывается и растворяется */}
      {/* фон шапки обрезан своим слоем: пятно шире экрана, но страница не прокручивается вбок */}
      <div className="g-bg" aria-hidden>
        {banner && (
          <div className="cover g-cover" ref={coverRef}>
            <FadeImg className="g-cover-img" src={banner} />
            <FadeImg className="g-cover-blur" src={banner} />
          </div>
        )}
        <div className="g-blob-wrap" ref={blobRef}>
          <Blob />
        </div>
      </div>

      <header className="g-hero">
        <h1 className="g-name g-shine" data-text={b.name} style={{ fontSize: nameSize(b.name) }}>
          {b.name}
        </h1>
        {s.description && <p className="g-lead">{s.description}</p>}
      </header>

      <div className="g-actions">
        <button
          className="g-cta g-cta-shine"
          disabled={!open}
          onClick={() => {
            haptic();
            p.onBook();
          }}
        >
          <span>{open ? "Записаться" : "Скоро здесь будет запись"}</span>
          {open && nearest && <span className="g-cta-pill">{nearest}</span>}
        </button>
        {next && (
          <button className="home-next g-mini" onClick={p.onMy}>
            <span className="g-thumb">
              <b>{new Intl.DateTimeFormat("ru-RU", { timeZone: tz, day: "numeric" }).format(new Date(next.starts_at))}</b>
              <span>{new Intl.DateTimeFormat("ru-RU", { timeZone: tz, month: "short" }).format(new Date(next.starts_at)).replace(".", "")}</span>
            </span>
            <span className="g-mini-main">
              <span className="g-mini-title">
                Ваша запись · {fmtWeekday(next.starts_at, tz)}, {fmtTime(next.starts_at, tz)}
              </span>
              <span className="g-mini-sub">{next.service_title}</span>
            </span>
            <Icon name="arrow" size={20} />
          </button>
        )}
      </div>

      {(s.address || s.contactPhone || s.links.length > 0) && (
        <section className="g-sec g-reveal">
          <div className="g-group">
            {s.address && (
              <button className="g-row-i" onClick={() => openLink(`https://yandex.ru/maps/?text=${encodeURIComponent(s.address)}`)}>
                <Icon name="pin" size={20} />
                <span className="g-row-i-main">{s.address}</span>
                <Icon name="arrow" size={16} />
              </button>
            )}
            {s.contactPhone && <CallRow phone={s.contactPhone} />}
            {s.links.map((l) => (
              <button key={l.url} className="g-row-i" onClick={() => openLink(l.url)}>
                <Icon name="link" size={20} />
                <span className="g-row-i-main">{l.title}</span>
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
        </section>
      )}

      {b.portfolio.length > 0 && (
        <section className="g-sec home-works g-reveal">
          <button className="g-sec-title" onClick={() => p.onPortfolio()}>
            Работы <Icon name="arrow" size={22} />
          </button>
          <div className="home-works-row">
            {b.portfolio.slice(0, 8).map((ph, i) => (
              <button key={ph.id} className="home-work" onClick={() => p.onPortfolio(i)}>
                <FadeImg src={photoUrl(ph.id)} alt={ph.caption} lazy />
              </button>
            ))}
          </div>
        </section>
      )}

      {open && (
        <section className="g-sec home-price g-reveal">
          <div className="g-sec-head">
            <h2 className="g-sec-title g-sec-title-static">Прайс</h2>
            {b.services.length > PRICE_PREVIEW && (
              <button className="g-pill" onClick={() => setAllPrices((v) => !v)}>
                {allPrices ? "Свернуть" : `Все ${b.services.length}`}
              </button>
            )}
          </div>
          <div className="g-group">
            {(allPrices ? b.services : b.services.slice(0, PRICE_PREVIEW)).map((svc, i) => (
              <button
                key={svc.id}
                className={`price-row g-item ${i >= PRICE_PREVIEW ? "price-row-more" : ""}`}
                style={i >= PRICE_PREVIEW ? { animationDelay: `${(i - PRICE_PREVIEW) * 0.03}s` } : undefined}
                onClick={() => {
                  haptic();
                  p.onBook(svc.id);
                }}
              >
                <span className="g-item-main">
                  <span className="g-item-title">{svc.title}</span>
                  <span className="g-item-sub">
                    {duration(svc.duration_min)}
                    {svc.description ? ` · ${svc.description}` : ""}
                  </span>
                </span>
                <span className="g-price">{rub(svc.price, svc.price_from)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!!p.boot.others?.length && p.onSwitch && (
        <section className="g-sec home-others g-reveal">
          <h2 className="g-sec-title g-sec-title-static">Другие ваши мастера</h2>
          <div className="g-group">
            {p.boot.others.map((o) => (
              <button key={o.id} className="g-item" onClick={() => p.onSwitch!(o.slug)}>
                {o.bannerFileId ? (
                  <img className="other-ava" src={bannerUrl(o.id, o.bannerFileId) || undefined} alt="" />
                ) : (
                  <span className="other-ava other-ava-letter">{o.name.trim().charAt(0).toUpperCase()}</span>
                )}
                <span className="g-item-main">
                  <span className="g-item-title">{o.name}</span>
                </span>
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
        </section>
      )}

      {(p.onAdmin || p.onSuper) && (
        <div className="g-admin">
          {p.onAdmin && (
            <button onClick={p.onAdmin}>
              <b>Вы мастер</b> — открыть панель
              <Icon name="arrow" size={16} />
            </button>
          )}
          {p.onSuper && (
            <button onClick={p.onSuper}>
              <b>Платформа</b> — создать бизнес или открыть любой
              <Icon name="arrow" size={16} />
            </button>
          )}
        </div>
      )}

      <footer className="g-foot">Онлайн-запись без звонков</footer>
    </div>
  );
}

/** Портфолио на весь экран: сетка, по тапу — фото крупно, листание стрелками/свайпом. */
export function PortfolioScreen(p: { boot: Boot; onBack: () => void; open?: number }) {
  const b = p.boot.business!;
  const photos = b.portfolio;
  const [open, setOpen] = useState<number | null>(p.open ?? null);
  const [touchX, setTouchX] = useState<number | null>(null);
  const go = (d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length));
  return (
    <div className="page g-page">
      <BackLink onBack={p.onBack} />
      <StepHead label={`${photos.length} фото`} title="Работы" />
      {!photos.length && <Empty title="Фото пока нет" />}
      <div className="gallery gallery-grid g-grid">
        {photos.map((ph, i) => (
          <button key={ph.id} className="gallery-item" onClick={() => setOpen(i)} style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}>
            <FadeImg src={photoUrl(ph.id)} alt={ph.caption} lazy />
          </button>
        ))}
      </div>
      {open !== null && (
        <div
          className="lightbox"
          onClick={() => setOpen(null)}
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            if (Math.abs(dx) > 40) {
              e.stopPropagation();
              go(dx < 0 ? 1 : -1);
            }
            setTouchX(null);
          }}
        >
          <img src={photoUrl(photos[open].id)} alt={photos[open].caption} onClick={(e) => e.stopPropagation()} />
          {photos.length > 1 && (
            <>
              <button className="lb-nav lb-prev" onClick={(e) => (e.stopPropagation(), go(-1))} aria-label="Предыдущее фото">
                ‹
              </button>
              <button className="lb-nav lb-next" onClick={(e) => (e.stopPropagation(), go(1))} aria-label="Следующее фото">
                ›
              </button>
              <div className="lb-count">
                {pad2(open + 1)} / {pad2(photos.length)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Шапка экрана: мелкая моно-подпись и крупный заголовок. */
function StepHead(p: { label: string; title: string; sub?: string }) {
  return (
    <header className="g-head">
      <span className="g-k">{p.label}</span>
      <h2 className="g-title">{p.title}</h2>
      {p.sub && <p className="g-head-sub">{p.sub}</p>}
    </header>
  );
}

type Step = "service" | "staff" | "time" | "details" | "done";

export function BookFlow(p: { boot: Boot; serviceId?: number; onBack: () => void; onMy: () => void }) {
  const b = p.boot.business!;
  const s = b.settings;
  const tz = b.timezone;
  const multiStaff = s.chooseStaff && b.staff.length > 1;

  const [service, setService] = useState<Service | null>(b.services.find((x) => x.id === p.serviceId) ?? null);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [staffChosen, setStaffChosen] = useState(!multiStaff);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState(p.boot.client?.name || p.boot.me.name || "");
  const [phone, setPhone] = useState(maskPhone(p.boot.client?.phone || ""));
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  // маска +7 (999) 123-45-67; стирание разделителя стирает и цифру перед ним
  const onPhone = (v: string) => {
    if (v.length < phone.length && v.replace(/\D/g, "") === phone.replace(/\D/g, "")) v = v.replace(/\d(?=\D*$)/, "");
    const next = maskPhone(v);
    setPhone(next);
    if (phoneErr) setPhoneErr(next && !checkPhone(next).ok ? phoneErr : null);
  };
  // «Взять номер из Telegram / MAX»: номер, подтверждённый самим мессенджером
  const canShareContact = inMax ? !!MAXA.requestContact : !!WA?.requestContact && WA?.isVersionAtLeast?.("6.9");
  const takeFromTelegram = () => {
    const put = (raw?: string) => {
      if (!raw) return;
      setPhone(maskPhone(raw.startsWith("+") ? raw : `+${raw}`));
      setPhoneErr(null);
      haptic("success");
    };
    if (inMax) {
      MAXA.requestContact()
        .then((r: any) => put(r?.phone))
        .catch(() => {});
      return;
    }
    WA.requestContact((ok: boolean, res: any) => {
      const raw: string | undefined = res?.responseUnsafe?.contact?.phone_number;
      if (ok && raw) put(raw);
      else if (ok) alertMsg("Номер отправлен в чат с ботом. Если поле не заполнилось — введите его вручную.");
    });
  };
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [done, setDone] = useState<{ id: number; starts_at: string } | null>(null);

  const step: Step = done ? "done" : !service ? "service" : !staffChosen ? "staff" : !slot ? "time" : "details";
  // на шаге с контактами внизу кнопка «Записаться на …» — нижнюю панель прячем
  useEffect(() => {
    document.documentElement.classList.toggle("tabbar-hidden", step === "details");
    return () => document.documentElement.classList.remove("tabbar-hidden");
  }, [step]);

  const back = () => {
    if (step === "details") setSlot(null);
    else if (step === "time" && multiStaff) {
      setStaffChosen(false);
      setDay(null);
    } else if ((step === "time" || step === "staff") && !p.serviceId) {
      setService(null);
      setDay(null);
    } else p.onBack();
  };

  const order: Step[] = multiStaff ? ["service", "staff", "time", "details"] : ["service", "time", "details"];
  const stepLabel = (st: Step) => `Шаг ${order.indexOf(st) + 1} из ${order.length}`;

  if (step === "done") {
    return <Ticket boot={p.boot} service={service!} done={done!} name={name} onMy={p.onMy} />;
  }

  return (
    <div className="page g-page">
      <BackLink onBack={back} />

      {step === "service" && (
        <>
          <StepHead label={stepLabel("service")} title="Что делаем?" />
          <div className="g-group g-pad">
            {b.services.map((svc) => (
              <button
                key={svc.id}
                className="g-item g-row"
                onClick={() => {
                  haptic();
                  setService(svc);
                }}
              >
                <span className="g-item-main">
                  <span className="g-item-title">{svc.title}</span>
                  <span className="g-item-sub">
                    {duration(svc.duration_min)}
                    {svc.description ? ` · ${svc.description}` : ""}
                  </span>
                </span>
                <span className="g-price">{rub(svc.price, svc.price_from)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "staff" && service && (
        <>
          <StepHead label={stepLabel("staff")} title="Кто примет?" sub={`${service.title} · ${duration(service.duration_min)}`} />
          <div className="g-group g-pad">
            <button
              className="g-item g-row"
              onClick={() => {
                haptic();
                setStaffId(null);
                setStaffChosen(true);
              }}
            >
              <span className="g-item-main">
                <span className="g-item-title">Любой свободный</span>
                <span className="g-item-sub">Покажем больше вариантов времени</span>
              </span>
              <Icon name="arrow" size={16} />
            </button>
            {b.staff.map((st) => (
              <button
                key={st.id}
                className="g-item g-row"
                onClick={() => {
                  haptic();
                  setStaffId(st.id);
                  setStaffChosen(true);
                }}
              >
                <span className="g-item-main">
                  <span className="g-item-title">{st.name}</span>
                  {st.description && <span className="g-item-sub">{st.description}</span>}
                </span>
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
        </>
      )}

      {step === "time" && service && (
        <>
          <StepHead
            label={stepLabel("time")}
            title="Во сколько?"
            sub={`${service.title} · ${duration(service.duration_min)} · ${rub(service.price, service.price_from)}${
              multiStaff ? ` · ${staffId ? b.staff.find((x) => x.id === staffId)?.name : "любой мастер"}` : ""
            }`}
          />
          <TimePicker
            businessId={b.id}
            serviceId={service.id}
            staffId={staffId}
            tz={tz}
            day={day}
            setDay={setDay}
            length={service.duration_min}
            onPick={(sl) => {
              haptic();
              setSlot(sl);
            }}
          />
        </>
      )}

      {step === "details" && service && slot && (
        <>
          <StepHead label={stepLabel("details")} title="Почти всё" />
          <div className="g-stub">
            <div className="g-stub-row">
              <span className="g-k">Услуга</span>
              <span>{service.title}</span>
            </div>
            <button className="g-stub-row g-stub-time" onClick={() => setSlot(null)}>
              <span className="g-k">Когда</span>
              <span>
                {fmtDay(slot.start, tz)} · <b>{slot.label}</b>
              </span>
              <span className="g-stub-edit">Изменить</span>
            </button>
            <div className="g-stub-row">
              <span className="g-k">Стоимость</span>
              <span>
                {rub(service.price, service.price_from)} · {duration(service.duration_min)}
              </span>
            </div>
          </div>
          <div className="form g-form">
            <Field label="Имя" value={name} onChange={setName} required autoComplete="given-name" />
            <Field
              label="Телефон"
              value={phone}
              onChange={onPhone}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 (999) 123-45-67"
              required={s.requirePhone}
              error={phoneErr}
            />
            {canShareContact && (
              <button type="button" className="g-chip share-phone" onClick={takeFromTelegram}>
                <Icon name="phone" size={14} /> Взять номер из {inMax ? "MAX" : "Telegram"}
              </button>
            )}
            {s.fields.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                value={answers[f.key] ?? ""}
                placeholder={f.placeholder}
                required={f.required}
                onChange={(v) => setAnswers((a) => ({ ...a, [f.key]: v }))}
              />
            ))}
            <Field label="Комментарий" value={comment} onChange={setComment} multiline placeholder="Необязательно" />
          </div>
          <MainButton
            text={`Записаться на ${slot.label}`}
            onClick={async () => {
              if (phone || s.requirePhone) {
                const pc = checkPhone(phone);
                if (!pc.ok) {
                  haptic("error");
                  setPhoneErr(pc.error);
                  return;
                }
              }
              await ensureWriteAccess();
              try {
                const res = await api("book", {
                  businessId: b.id,
                  serviceId: service.id,
                  staffId,
                  start: slot.start,
                  name,
                  phone,
                  answers,
                  comment,
                });
                haptic("success");
                nearCache.delete(b.id);
                window.scrollTo(0, 0);
                setDone(res);
              } catch (e: any) {
                haptic("error");
                await alertMsg(e.message);
                if (/заняли/.test(e.message)) {
                  setSlot(null);
                  setDay(null);
                }
              }
            }}
          />
        </>
      )}
    </div>
  );
}

/** «Вы записаны»: постер с текучим пятном — его удобно заскринить в сторис или переслать. */
function Ticket(p: { boot: Boot; service: Service; done: { id: number; starts_at: string }; name: string; onMy: () => void }) {
  const b = p.boot.business!;
  const s = b.settings;
  const tz = b.timezone;
  const at = new Date(p.done.starts_at);
  const weekday = new Intl.DateTimeFormat("ru-RU", { timeZone: tz, weekday: "long" }).format(at);
  const date = new Intl.DateTimeFormat("ru-RU", { timeZone: tz, day: "numeric", month: "long" }).format(at);
  const first = p.name.trim().split(/\s+/)[0] || "";
  const no = String(p.done.id).padStart(4, "0");
  const shareUrl = inMax ? p.boot.share?.max || p.boot.share?.tg : p.boot.share?.tg;
  return (
    <div className="page g-page g-done">
      <header className="g-head">
        <span className="g-k">Готово · запись № {no}</span>
        <h2 className="g-title g-shine" data-text="Вы записаны!">
          Вы записаны!
        </h2>
      </header>
      <div className="g-poster">
        <Blob className="g-blob-poster" />
        <div className="g-poster-meta">
          <span>{b.name}</span>
          <span>{date}</span>
        </div>
        {first && <div className="g-poster-name">{first},</div>}
        <div className="g-poster-lead">ждём вас</div>
        <div className="g-poster-when">
          <span>{weekday}</span>
          <span className="g-shine" data-text={fmtTime(at, tz)}>
            {fmtTime(at, tz)}
          </span>
          </div>
        <div className="g-poster-what">
          <span>{p.service.title}</span>
          {s.address && <span>{s.address}</span>}
        </div>
        <div className="g-poster-foot">
          <Barcode seed={`${b.slug}${no}`} />
          <span>
            Запись № {no}
            <br />
            онлайн, без звонков
          </span>
        </div>
      </div>
      <p className="g-note">
        Напомним накануне{s.remind2h ? " и за 2 часа" : ""} — в чат с ботом. Скриншот этой карточки — готовая сторис.
      </p>
      {s.afterBookingText && <p className="g-note g-note-strong">{s.afterBookingText}</p>}
      <div className="g-done-actions">
        {shareUrl && (
          <button className="g-cta" onClick={() => shareLink(shareUrl, `${b.name} — запись онлайн, без звонков:`)}>
            <span>Позвать с собой</span>
          </button>
        )}
        <button className="g-ghost" onClick={p.onMy}>
          Мои записи
        </button>
      </div>
    </div>
  );
}

function TimePicker(p: {
  businessId: number;
  serviceId: number;
  staffId: number | null;
  tz: string;
  day: string | null;
  setDay: (d: string) => void;
  onPick: (s: Slot) => void;
  length: number;
}) {
  const { data, error, reload } = useLoad<Record<string, Slot[]>>(
    () => api("availability", { businessId: p.businessId, serviceId: p.serviceId, staffId: p.staffId, days: 21 }),
    [p.serviceId, p.staffId],
  );
  const days = useMemo(() => Object.keys(data ?? {}), [data]);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    if (days.length && (!p.day || !days.includes(p.day))) p.setDay(days[0]);
  }, [days]);

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Skeleton rows={3} kind="slots" />;
  if (!days.length) return <Empty icon={<Icon name="clock" size={40} />} title="Свободного времени пока нет" text="Загляните позже или выберите другую услугу." />;

  const slots = data[p.day ?? days[0]] ?? [];
  const groups: [string, Slot[]][] = [
    ["Утро", slots.filter((s) => s.label < "12:00")],
    ["День", slots.filter((s) => s.label >= "12:00" && s.label < "17:00")],
    ["Вечер", slots.filter((s) => s.label >= "17:00")],
  ];
  return (
    <>
      <div className="days g-days">
        {days.map((d) => (
          <button key={d} className={`day ${d === p.day ? "day-on" : ""}`} onClick={() => p.setDay(d)}>
            <span className="day-wd">{dayWord(d, p.tz).replace(/ \d+$/, "").replace(/^./, (c) => c.toUpperCase())}</span>
            <span className="day-n">{Number(d.slice(8))}</span>
          </button>
        ))}
      </div>
      <div className="g-tracks" key={p.day}>
        {groups
          .filter(([, list]) => list.length)
          .map(([title, list]) => (
            <div key={title} className="g-side">
              <div className="g-side-title">
                <span>{title}</span>
                <span className="g-k">
                  {list.length} {plural(list.length, "окно", "окна", "окон")}
                </span>
              </div>
              <div className="g-slots">
                {list.map((sl, i) => (
                  <button
                    key={sl.start}
                    style={{ animationDelay: `${Math.min(i, 9) * 0.025}s` }}
                    className={`slot g-slot ${picked === sl.start ? "g-slot-on" : ""}`}
                    onClick={() => {
                      if (picked) return;
                      setPicked(sl.start);
                      // короткая вспышка выбранного времени, потом — к контактам
                      setTimeout(() => p.onPick(sl), 170);
                    }}
                  >
                    {sl.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

export function MyBookings(p: { boot: Boot; onBack: () => void; onBook: () => void }) {
  const b = p.boot.business!;
  const tz = b.timezone;
  const { data, error, reload } = useLoad<Booking[]>(() => api("myBookings", { businessId: b.id }), []);
  const now = Date.now();
  const upcoming = (data ?? []).filter((x) => x.status === "confirmed" && new Date(x.starts_at).getTime() > now).reverse();
  const past = (data ?? []).filter((x) => !(x.status === "confirmed" && new Date(x.starts_at).getTime() > now));

  const cancel = async (bk: Booking) => {
    if (!(await confirmMsg(`Отменить запись на ${fmtDay(bk.starts_at, tz)}, ${fmtTime(bk.starts_at, tz)}?`))) return;
    try {
      await api("cancelMy", { businessId: b.id, bookingId: bk.id });
      haptic("success");
      nearCache.delete(b.id);
      reload();
    } catch (e: any) {
      await alertMsg(e.message);
    }
  };
  const dm = (iso: string) => new Intl.DateTimeFormat("ru-RU", { timeZone: tz, month: "short" }).format(new Date(iso)).replace(".", "");
  const dd = (iso: string) => new Intl.DateTimeFormat("ru-RU", { timeZone: tz, day: "numeric" }).format(new Date(iso));

  return (
    <div className="page g-page">
      <BackLink onBack={p.onBack} />
      <StepHead label={b.name} title="Мои записи" />
      {error && <ErrorBox error={error} onRetry={reload} />}
      {!data && !error && <Skeleton rows={3} />}
      {data && !upcoming.length && (
        <div className="g-empty">
          <Blob className="g-blob-small" />
          <b>Пока пусто</b>
          <p>Активных записей нет. Выберите время — займёт минуту.</p>
          <button className="g-cta" onClick={p.onBook}>
            <span>Записаться</span>
          </button>
        </div>
      )}
      {upcoming.length > 0 && (
        <section className="section g-sec">
          <h2 className="g-sec-title g-sec-title-static">Предстоящие</h2>
          {upcoming.map((bk) => (
            <div key={bk.id} className="g-mini g-mini-static">
              <span className="g-thumb">
                <b>{dd(bk.starts_at)}</b>
                <span>{dm(bk.starts_at)}</span>
              </span>
              <span className="g-mini-main">
                <span className="g-mini-title">
                  {fmtWeekday(bk.starts_at, tz).replace(/^./, (c) => c.toUpperCase())}, {fmtTime(bk.starts_at, tz)}
                </span>
                <span className="g-mini-sub">
                  {bk.service_title}
                  {bk.price ? ` · ${rub(bk.price)}` : ""}
                </span>
              </span>
              <button className="g-pill" onClick={() => cancel(bk)}>
                Отменить
              </button>
            </div>
          ))}
          <p className="g-note">Отменить онлайн можно не позже чем за {b.settings.cancelHours} ч.</p>
        </section>
      )}
      {past.length > 0 && (
        <section className="section g-sec">
          <h2 className="g-sec-title g-sec-title-static">История</h2>
          <div className="g-group">
            {past.map((bk) => (
              <div key={bk.id} className="g-item g-item-static">
                <span className="g-item-main">
                  <span className="g-item-title">{bk.service_title}</span>
                  <span className="g-item-sub">
                    {fmtDay(bk.starts_at, tz)} · {fmtTime(bk.starts_at, tz)}
                  </span>
                </span>
                <StatusBadge status={bk.status} by={bk.cancelled_by} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function StatusBadge({ status, by }: { status: Booking["status"]; by?: Booking["cancelled_by"] }) {
  const map: Record<Booking["status"], [string, string]> = {
    confirmed: ["Записан", "badge-blue"],
    done: ["Был(а)", "badge-green"],
    no_show: ["Не пришёл", "badge-gray"],
    cancelled: [by === "admin" ? "Отменено мастером" : "Отменено", "badge-red"],
  };
  const [t, c] = map[status];
  return <span className={`badge ${c}`}>{t}</span>;
}

export type ClientTab = "home" | "portfolio" | "book" | "my";

/** Нижняя панель клиента: иконки с мелкими подписями, текущая вкладка — ярче. */
export function ClientTabBar(p: { active: ClientTab | null; hasWorks: boolean; onGo: (t: ClientTab) => void }) {
  const items: [ClientTab, string, string][] = [
    ["home", "Главная", "home"],
    ...(p.hasWorks ? ([["portfolio", "Работы", "photo"]] as [ClientTab, string, string][]) : []),
    ["book", "Запись", "calendar"],
    ["my", "Мои записи", "list"],
  ];
  return (
    <nav className="tabbar g-tabbar">
      {items.map(([t, label, icon]) => (
        <button
          key={t}
          className={`tabbar-item ${p.active === t ? "tabbar-on" : ""}`}
          aria-current={p.active === t ? "page" : undefined}
          onClick={() => {
            haptic();
            p.onGo(t);
          }}
        >
          <Icon name={icon as any} size={24} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
