// Клиентская часть в стиле «Розовый свет»: пастельный фон со свечением и зерном, имя мастера рукописным (Great Vibes),
// заголовки и кнопки — Unbounded, текст, цифры и подписи — Onest. Время — как трек-лист альбома, после записи — постер для сторис.
import { useEffect, useMemo, useState } from "react";
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

/** Размер рукописного имени: короткое — крупно, длинное — мельче, чтобы влезало в 2 строки. */
function scriptSize(text: string): number {
  const n = text.trim().length;
  return n <= 9 ? 66 : n <= 14 ? 54 : n <= 20 ? 44 : n <= 28 ? 36 : 30;
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
  const [label, setLabel] = useState(fresh ?? "");
  useEffect(() => {
    if (!first || fresh !== null) return;
    let alive = true;
    api<Record<string, Slot[]>>("availability", { businessId: b.id, serviceId: first, staffId: null, days: 7 })
      .then((data) => {
        const day = Object.keys(data).find((d) => data[d].length);
        const v = day ? `${dayWord(day, b.timezone)} ${data[day][0].label}` : "";
        nearCache.set(b.id, { at: Date.now(), label: v });
        if (alive) setLabel(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
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
  const banner = bannerUrl(b.id, s.bannerFileId);
  const [allPrices, setAllPrices] = useState(false);
  const nearest = useNearest(b);
  const open = b.services.length > 0;

  return (
    <div className={`page g-page g-home ${banner ? "g-has-cover" : ""}`}>
      {/* обложка во всю ширину: сверху и снизу размывается и растворяется в цвете страницы */}
      {banner && (
        <div className="cover g-cover" aria-hidden>
          <img className="g-cover-img" src={banner} alt="" />
          <img className="g-cover-blur" src={banner} alt="" />
        </div>
      )}

      <header className="g-hero">
        <h1 className="g-script" style={{ fontSize: scriptSize(b.name) }}>
          {b.name}
        </h1>
        {s.description && <p className="g-lead">{s.description}</p>}
        {(s.address || s.contactPhone || s.links.length > 0) && (
          <div className="g-facts">
            {s.address && (
              <button className="g-fact" onClick={() => openLink(`https://yandex.ru/maps/?text=${encodeURIComponent(s.address)}`)}>
                <span className="g-k">адрес</span>
                <span className="g-v">{s.address}</span>
              </button>
            )}
            {s.contactPhone && (
              <a className="g-fact" href={`tel:${s.contactPhone.replace(/[^\d+]/g, "")}`}>
                <span className="g-k">телефон</span>
                <span className="g-v">{s.contactPhone}</span>
              </a>
            )}
            {s.links.length > 0 && (
              <div className="g-fact">
                <span className="g-k">ссылки</span>
                <span className="g-links">
                  {s.links.map((l) => (
                    <button key={l.url} className="g-link" onClick={() => openLink(l.url)}>
                      {l.title}
                    </button>
                  ))}
                </span>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="g-actions">
        <button
          className="g-cta"
          disabled={!open}
          onClick={() => {
            haptic();
            p.onBook();
          }}
        >
          <span>{open ? "записаться" : "скоро здесь будет запись"}</span>
          {open && nearest && <span className="g-cta-pill">{nearest}</span>}
        </button>
        {p.boot.next && (
          <button className="home-next g-next" onClick={p.onMy}>
            <span className="g-k">ваша запись</span>
            <span className="g-next-when">
              {fmtDay(p.boot.next.starts_at, b.timezone)} · {fmtTime(p.boot.next.starts_at, b.timezone)}
            </span>
            <span className="g-next-what">{p.boot.next.service_title}</span>
            <Icon name="arrow" size={18} />
          </button>
        )}
      </div>

      {b.portfolio.length > 0 && (
        <section className="g-sec home-works">
          <div className="g-sec-head">
            <h2>работы</h2>
            <button onClick={() => p.onPortfolio()}>
              все {b.portfolio.length} →
            </button>
          </div>
          <div className="home-works-row">
            {b.portfolio.slice(0, 8).map((ph, i) => (
              <button key={ph.id} className="home-work" onClick={() => p.onPortfolio(i)}>
                <img src={photoUrl(ph.id)} alt={ph.caption} loading="lazy" />
                <span className="g-work-n">{pad2(i + 1)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {open && (
        <section className="g-sec home-price">
          <div className="g-sec-head">
            <h2>прайс</h2>
            {b.services.length > PRICE_PREVIEW && (
              <button onClick={() => setAllPrices((v) => !v)}>{allPrices ? "свернуть ↑" : `все ${b.services.length} ↓`}</button>
            )}
          </div>
          <div className="g-list">
            {(allPrices ? b.services : b.services.slice(0, PRICE_PREVIEW)).map((svc, i) => (
              <button
                key={svc.id}
                className={`price-row g-track ${i >= PRICE_PREVIEW ? "price-row-more" : ""}`}
                style={i >= PRICE_PREVIEW ? { animationDelay: `${(i - PRICE_PREVIEW) * 0.03}s` } : undefined}
                onClick={() => {
                  haptic();
                  p.onBook(svc.id);
                }}
              >
                <span className="g-n">{pad2(i + 1)}</span>
                <span className="g-track-main">
                  <span className="g-track-title">{svc.title}</span>
                  <span className="g-track-sub">
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
        <section className="g-sec home-others">
          <div className="g-sec-head">
            <h2>другие ваши мастера</h2>
          </div>
          <div className="g-list">
            {p.boot.others.map((o) => (
              <button key={o.id} className="g-track" onClick={() => p.onSwitch!(o.slug)}>
                {o.bannerFileId ? (
                  <img className="other-ava" src={bannerUrl(o.id, o.bannerFileId) || undefined} alt="" />
                ) : (
                  <span className="other-ava other-ava-letter">{o.name.trim().charAt(0).toUpperCase()}</span>
                )}
                <span className="g-track-main">
                  <span className="g-track-title">{o.name}</span>
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
              <span className="g-k">вы мастер</span> открыть панель →
            </button>
          )}
          {p.onSuper && (
            <button onClick={p.onSuper}>
              <span className="g-k">платформа</span> создать бизнес или открыть любой →
            </button>
          )}
        </div>
      )}

      <footer className="g-foot">
        <span className="g-script g-foot-name">{b.name}</span>
        <span className="g-foot-row">
          <Barcode seed={b.slug} height={26} />
          <span className="g-k">онлайн-запись
            <br />
            без звонков
          </span>
        </span>
      </footer>
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
          <button key={ph.id} className="gallery-item" onClick={() => setOpen(i)}>
            <img src={photoUrl(ph.id)} alt={ph.caption} loading="lazy" />
            <span className="g-work-n">{pad2(i + 1)}</span>
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
  const stepLabel = (st: Step, what: string) => `шаг ${order.indexOf(st) + 1} / ${order.length} · ${what}`;

  if (step === "done") {
    return <Ticket boot={p.boot} service={service!} done={done!} name={name} onMy={p.onMy} />;
  }

  return (
    <div className="page g-page">
      <BackLink onBack={back} />

      {step === "service" && (
        <>
          <StepHead label={stepLabel("service", s.labels.service.toLowerCase())} title="Что делаем?" />
          <div className="g-list">
            {b.services.map((svc, i) => (
              <button
                key={svc.id}
                className="g-track g-row"
                onClick={() => {
                  haptic();
                  setService(svc);
                }}
              >
                <span className="g-n">{pad2(i + 1)}</span>
                <span className="g-track-main">
                  <span className="g-track-title">{svc.title}</span>
                  <span className="g-track-sub">
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
          <StepHead label={stepLabel("staff", s.labels.staff.toLowerCase())} title="Кто примет?" sub={`${service.title} · ${duration(service.duration_min)}`} />
          <div className="g-list">
            <button
              className="g-track g-row"
              onClick={() => {
                haptic();
                setStaffId(null);
                setStaffChosen(true);
              }}
            >
              <span className="g-n">✦</span>
              <span className="g-track-main">
                <span className="g-track-title">Любой свободный</span>
                <span className="g-track-sub">покажем больше вариантов времени</span>
              </span>
            </button>
            {b.staff.map((st, i) => (
              <button
                key={st.id}
                className="g-track g-row"
                onClick={() => {
                  haptic();
                  setStaffId(st.id);
                  setStaffChosen(true);
                }}
              >
                <span className="g-n">{pad2(i + 1)}</span>
                <span className="g-track-main">
                  <span className="g-track-title">{st.name}</span>
                  {st.description && <span className="g-track-sub">{st.description}</span>}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "time" && service && (
        <>
          <StepHead
            label={stepLabel("time", "время")}
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
          <StepHead label={stepLabel("details", "контакты")} title="Почти всё" />
          <div className="g-stub">
            <div className="g-stub-row">
              <span className="g-k">услуга</span>
              <span>{service.title}</span>
            </div>
            <button className="g-stub-row g-stub-time" onClick={() => setSlot(null)}>
              <span className="g-k">когда</span>
              <span>
                {fmtDay(slot.start, tz)} · <b>{slot.label}</b>
              </span>
              <span className="g-stub-edit">изменить</span>
            </button>
            <div className="g-stub-row">
              <span className="g-k">стоимость</span>
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

/** «Вы записаны»: постер в духе афиши — его удобно заскринить в сторис или переслать. */
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
        <span className="g-k">готово · запись № {no}</span>
        <h2 className="g-title">Вы записаны!</h2>
      </header>
      <div className="g-poster">
        <div className="g-poster-meta">
          <span>@{b.slug}</span>
          <span>{date}</span>
        </div>
        {first && (
          <div className="g-script g-poster-name" style={{ fontSize: Math.min(72, scriptSize(first) + 8) }}>
            {first}
          </div>
        )}
        <div className="g-poster-when">
          <span>{weekday}</span>
          <span>{fmtTime(at, tz)}</span>
        </div>
        <div className="g-poster-what">
          <span>{p.service.title}</span>
          {s.address && <span>{s.address}</span>}
        </div>
        <div className="g-script g-poster-sign">до встречи</div>
        <div className="g-poster-foot">
          <Barcode seed={`${b.slug}${no}`} />
          <span className="g-k">
            {b.name}
            <br />
            запись № {no}
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
            <span>позвать с собой</span>
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
  if (!data) return <Spinner />;
  if (!days.length) return <Empty icon={<Icon name="clock" size={40} />} title="Свободного времени пока нет" text="Загляните позже или выберите другую услугу." />;

  const slots = data[p.day ?? days[0]] ?? [];
  const groups: [string, Slot[]][] = [
    ["утро", slots.filter((s) => s.label < "12:00")],
    ["день", slots.filter((s) => s.label >= "12:00" && s.label < "17:00")],
    ["вечер", slots.filter((s) => s.label >= "17:00")],
  ];
  const len = `${Math.floor(p.length / 60)}:${pad2(p.length % 60)}`;
  let n = 0;
  return (
    <>
      <div className="days g-days">
        {days.map((d) => (
          <button key={d} className={`day ${d === p.day ? "day-on" : ""}`} onClick={() => p.setDay(d)}>
            <span className="day-wd">{dayWord(d, p.tz).replace(/ \d+$/, "")}</span>
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
                <span className="g-k">{title}</span>
                <span className="g-k">{list.length} {plural(list.length, "окно", "окна", "окон")}</span>
              </div>
              {list.map((sl) => {
                n += 1;
                return (
                  <button
                    key={sl.start}
                    className={`slot g-slot ${picked === sl.start ? "g-slot-on" : ""}`}
                    onClick={() => {
                      if (picked) return;
                      setPicked(sl.start);
                      // короткая вспышка выбранного «трека», потом — к контактам
                      setTimeout(() => p.onPick(sl), 170);
                    }}
                  >
                    <span className="g-n">{pad2(n)}</span>
                    <span className="g-slot-time">{sl.label}</span>
                    <span className="g-slot-len">{picked === sl.start ? "▸ выбрано" : len}</span>
                  </button>
                );
              })}
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
      <StepHead label={b.name.toLowerCase()} title="Мои записи" />
      {error && <ErrorBox error={error} onRetry={reload} />}
      {!data && !error && <Spinner />}
      {data && !upcoming.length && (
        <div className="g-empty">
          <span className="g-script">пока пусто</span>
          <p>Активных записей нет. Выберите время — займёт минуту.</p>
          <button className="g-cta" onClick={p.onBook}>
            <span>записаться</span>
          </button>
        </div>
      )}
      {upcoming.length > 0 && (
        <section className="section g-sec">
          <div className="g-sec-head">
            <h2>Предстоящие</h2>
            <span className="g-k">{upcoming.length}</span>
          </div>
          {upcoming.map((bk) => (
            <div key={bk.id} className="g-ticket">
              <div className="g-ticket-date">
                <b>{dd(bk.starts_at)}</b>
                <span>{dm(bk.starts_at)}</span>
              </div>
              <div className="g-ticket-main">
                <span className="g-ticket-time">
                  {fmtWeekday(bk.starts_at, tz)} · {fmtTime(bk.starts_at, tz)}
                </span>
                <span className="g-ticket-what">
                  {bk.service_title}
                  {bk.price ? ` · ${rub(bk.price)}` : ""}
                </span>
                <button className="g-ticket-cancel" onClick={() => cancel(bk)}>
                  Отменить
                </button>
              </div>
            </div>
          ))}
          <p className="g-note">Отменить онлайн можно не позже чем за {b.settings.cancelHours} ч.</p>
        </section>
      )}
      {past.length > 0 && (
        <section className="section g-sec">
          <div className="g-sec-head">
            <h2>История</h2>
          </div>
          <div className="g-list">
            {past.map((bk, i) => (
              <div key={bk.id} className="g-track g-track-static">
                <span className="g-n">{pad2(i + 1)}</span>
                <span className="g-track-main">
                  <span className="g-track-title">{bk.service_title}</span>
                  <span className="g-track-sub">
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

/** Нижняя панель клиента: Главная · Работы · Запись · Мои записи — точка у текущей. */
export function ClientTabBar(p: { active: ClientTab | null; hasWorks: boolean; onGo: (t: ClientTab) => void }) {
  const items: [ClientTab, string][] = [
    ["home", "Главная"],
    ...(p.hasWorks ? ([["portfolio", "Работы"]] as [ClientTab, string][]) : []),
    ["book", "Запись"],
    ["my", "Мои записи"],
  ];
  return (
    <nav className="tabbar g-tabbar">
      {items.map(([t, label]) => (
        <button
          key={t}
          className={`tabbar-item ${p.active === t ? "tabbar-on" : ""}`}
          aria-current={p.active === t ? "page" : undefined}
          onClick={() => {
            haptic();
            p.onGo(t);
          }}
        >
          <i className="g-tab-dot" aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
