import { type DragEvent, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  addDays,
  alertMsg,
  api,
  bannerUrl,
  compressImage,
  dominantColorOfFile,
  confirmMsg,
  copy,
  dateOnly,
  duration,
  fmtDay,
  fmtDayShort,
  fmtTime,
  fmtWeekday,
  haptic,
  logClientError,
  logoUrl,
  photoUrl,
  staffPhotoUrl,
  rub,
  RU_TIMEZONES,
  shareLink,
  todayIn,
} from "./lib";
import { BW_ID, COLORS, type Glow, glowFor, glowVars, PASTELS } from "./palette";
import type { Album, Booking, PublicBusiness, Service, Settings, Staff, Work } from "./types";
import { StatusBadge } from "./client";
import {
  Avatar,
  BackLink,
  Cell,
  Empty,
  ErrorBox,
  Field,
  Icon,
  MainButton,
  Section,
  Select,
  Spinner,
  Tabs,
  TimeSelect,
  Toast,
  ICON_STYLES,
  Toggle,
  useLoad,
  useToast,
} from "./ui";

interface Overview {
  business: PublicBusiness;
  role: "super" | "owner" | "admin";
  stats: { clients: number; bookings: number; upcoming: number; cancelled: number; revenue_30d: number };
  services: Service[];
  staff: Staff[];
  admins: { tg_id: number; role: string; first_name: string | null; username: string | null }[];
  links: { client: string; admin: string; botStart: string; maxClient?: string; maxAdmin?: string };
}

type Tab = "bookings" | "services" | "schedule" | "more";
type Sub = null | "settings" | "staff" | "portfolio" | "clients" | "broadcast" | "admins" | "share";

export function AdminPanel(p: {
  businessId: number;
  onBack: (() => void) | null;
  onPreview: () => void;
  onTheme?: (b: { id: number; settings: Overview["business"]["settings"] }) => void;
}) {
  const { data, error, reload } = useLoad<Overview>(() => api("admin.overview", { businessId: p.businessId }), [p.businessId]);
  // цвет баннера бизнеса красит и панель управления
  useEffect(() => {
    if (data) p.onTheme?.(data.business);
  }, [data]);
  const [tab, setTab] = useState<Tab>("bookings");
  const [sub, setSub] = useState<Sub>(null);
  const [toast, showToast] = useToast();

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  const b = data.business;
  const ctx = { ov: data, reload, toast: showToast };

  if (sub) {
    const back = () => setSub(null);
    return (
      <div className="page">
        <BackLink onBack={back} />
        {sub === "settings" && <SettingsEditor {...ctx} onSaved={back} />}
        {sub === "staff" && <StaffEditor {...ctx} />}
        {sub === "portfolio" && <PortfolioEditor {...ctx} />}
        {sub === "clients" && <ClientsList {...ctx} />}
        {sub === "broadcast" && <Broadcast {...ctx} />}
        {sub === "admins" && <Admins {...ctx} />}
        {sub === "share" && <ShareLinks {...ctx} />}
        <Toast text={toast} />
      </div>
    );
  }

  return (
    <div className="page">
      <BackLink onBack={p.onBack} />
      <div className="admin-head">
        <div className="admin-emoji">
          {b.settings.bannerFileId ? <img src={bannerUrl(b.id, b.settings.bannerFileId) || undefined} alt="" /> : b.name.trim().charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="admin-name">{b.name}</div>
          <div className="muted small">
            {data.role === "owner" ? "Владелец" : data.role === "super" ? "Суперадмин" : "Администратор"}
            {b.status === "blocked" && " · заблокирован"}
          </div>
        </div>
        <button className="btn btn-small btn-secondary" onClick={p.onPreview}>
          <Icon name="eye" size={16} />
          <span className="lbl-long">Как видят клиенты</span>
          <span className="lbl-short">Превью</span>
        </button>
      </div>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          ["bookings", "Записи"],
          ["services", "Услуги"],
          ["schedule", "График"],
          ["more", "Ещё"],
        ]}
      />
      {tab === "bookings" && <BookingsTab {...ctx} />}
      {tab === "services" && <ServicesTab {...ctx} />}
      {tab === "schedule" && <ScheduleTab {...ctx} />}
      {tab === "more" && (
        <>
          <div className="stats">
            <Stat n={data.stats.upcoming} label="предстоит" />
            <Stat n={data.stats.clients} label="клиентов" />
            <Stat n={data.stats.bookings} label="записей всего" />
            <Stat n={rub(data.stats.revenue_30d).replace("бесплатно", "0 ₽")} label="за 30 дней" />
          </div>
          <Section>
            <Cell before={<Icon name="link" size={20} />} title="Ссылка для клиентов и QR" onClick={() => setSub("share")} chevron />
            <Cell before={<Icon name="sliders" size={20} />} title="Настройки и тексты" onClick={() => setSub("settings")} chevron />
            <Cell before={<Icon name="users" size={20} />} title={b.settings.labels.staffPlural} onClick={() => setSub("staff")} chevron />
            <Cell before={<Icon name="photo" size={20} />} title="Портфолио" onClick={() => setSub("portfolio")} chevron />
            <Cell before={<Icon name="contacts" size={20} />} title="Клиенты" onClick={() => setSub("clients")} chevron />
            {data.role !== "admin" && <Cell before={<Icon name="megaphone" size={20} />} title="Рассылка клиентам" onClick={() => setSub("broadcast")} chevron />}
            <Cell before={<Icon name="shield" size={20} />} title="Администраторы" onClick={() => setSub("admins")} chevron />
          </Section>
        </>
      )}
      <Toast text={toast} />
    </div>
  );
}

type Ctx = { ov: Overview; reload: () => void; toast: (t: string) => void };

const Stat = ({ n, label }: { n: number | string; label: string }) => (
  <div className="stat">
    <div className="stat-n">{n}</div>
    <div className="stat-l">{label}</div>
  </div>
);

// ---------------- Записи ----------------

function BookingsTab({ ov }: Ctx) {
  const b = ov.business;
  const tz = b.timezone;
  const [date, setDate] = useState(todayIn(tz));
  const { data, error, reload } = useLoad<Booking[]>(() => api("admin.bookings", { businessId: b.id, date, days: 1 }), [date]);
  const week = Array.from({ length: 7 }, (_, i) => addDays(date, i - 3));

  const act = async (bk: Booking, action: "done" | "no_show" | "cancel") => {
    if (action === "cancel") {
      if (!(await confirmMsg(`Отменить запись ${bk.client_name} и уведомить клиента?`))) return;
      await api("admin.cancelBooking", { businessId: b.id, bookingId: bk.id });
    } else {
      await api("admin.setStatus", { businessId: b.id, bookingId: bk.id, status: action });
    }
    haptic("success");
    reload();
  };

  const list = data ?? [];
  return (
    <>
      <div className="days days-compact">
        <button className="day" onClick={() => setDate(addDays(date, -7))}>‹</button>
        {week.map((d) => (
          <button key={d} className={`day ${d === date ? "day-on" : ""} ${d === todayIn(tz) ? "day-today" : ""}`} onClick={() => setDate(d)}>
            <span className="day-wd">{fmtWeekday(dateOnly(d), "UTC")}</span>
            <span className="day-n">{fmtDayShort(dateOnly(d), "UTC")}</span>
          </button>
        ))}
        <button className="day" onClick={() => setDate(addDays(date, 7))}>›</button>
      </div>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {!data && !error && <Spinner />}
      {data && !list.length && <Empty icon={<Icon name="calendar" size={40} />} title="Записей нет" text={fmtDay(dateOnly(date), "UTC")} />}
      {list.map((bk) => (
        <div key={bk.id} className={`booking ${bk.status === "cancelled" ? "booking-off" : ""}`}>
          <div className="booking-time">
            {fmtTime(bk.starts_at, tz)}
            <span className="muted small">–{fmtTime(bk.ends_at, tz)}</span>
          </div>
          <div className="booking-main">
            <div className="cell-title">
              {bk.client_name} <StatusBadge status={bk.status} by={bk.cancelled_by} />
            </div>
            <div className="cell-sub">
              {bk.service_title}
              {bk.price ? ` · ${rub(bk.price)}` : ""}
              {ov.staff.length > 1 ? ` · ${bk.staff_name}` : ""}
            </div>
            {bk.client_phone && (
              <a className="link small" href={`tel:${bk.client_phone.replace(/[^\d+]/g, "")}`}>
                <Icon name="phone" size={13} /> {bk.client_phone}
              </a>
            )}
            {Object.entries(bk.answers ?? {}).map(([k, v]) => (
              <div key={k} className="small muted">
                {b.settings.fields.find((f) => f.key === k)?.label ?? k}: {v}
              </div>
            ))}
            {bk.comment && <div className="small muted booking-comment"><Icon name="message" size={13} /> {bk.comment}</div>}
            {bk.status === "confirmed" && (
              <div className="booking-actions">
                {new Date(bk.starts_at).getTime() < Date.now() && (
                  <>
                    <button className="btn btn-small btn-secondary" onClick={() => act(bk, "done")}>Пришёл</button>
                    <button className="btn btn-small btn-secondary" onClick={() => act(bk, "no_show")}>Не пришёл</button>
                  </>
                )}
                <button className="btn btn-small btn-danger" onClick={() => act(bk, "cancel")}>Отменить</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

// ---------------- Услуги ----------------

function ServicesTab({ ov, reload, toast }: Ctx) {
  const [edit, setEdit] = useState<Partial<Service> | null>(null);
  const b = ov.business;
  if (edit) {
    const set = (k: keyof Service, v: any) => setEdit({ ...edit, [k]: v });
    return (
      <>
        <BackLink onBack={() => setEdit(null)} />
        <Section title={edit.id ? "Редактирование" : "Новая услуга"}>
          <div className="form">
            <Field label="Название" value={edit.title ?? ""} onChange={(v) => set("title", v)} required />
            <Field label="Цена, ₽" value={edit.price ?? 0} onChange={(v) => set("price", Number(v.replace(/\D/g, "")) || 0)} inputMode="numeric" />
            <Toggle label="Цена «от»" checked={Boolean(edit.price_from)} onChange={(v) => set("price_from", v)} />
            <Select
              label="Длительность"
              value={String(edit.duration_min ?? 60)}
              onChange={(v) => set("duration_min", Number(v))}
              options={[15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300, 360, 480].map((m) => [String(m), duration(m)])}
            />
            <Field label="Описание" value={edit.description ?? ""} onChange={(v) => set("description", v)} multiline />
            <Toggle label="Показывать клиентам" checked={edit.active !== false} onChange={(v) => set("active", v)} />
          </div>
        </Section>
        {edit.id && (
          <Section>
            <Cell
              title="Удалить услугу"
              danger
              onClick={async () => {
                if (!(await confirmMsg("Удалить услугу? Прошлые записи сохранятся."))) return;
                await api("admin.deleteService", { businessId: b.id, id: edit.id });
                setEdit(null);
                reload();
              }}
            />
          </Section>
        )}
        <MainButton
          text="Сохранить"
          onClick={async () => {
            try {
              await api("admin.saveService", { businessId: b.id, service: edit });
              haptic("success");
              toast("Сохранено");
              setEdit(null);
              reload();
            } catch (e: any) {
              await alertMsg(e.message);
            }
          }}
        />
      </>
    );
  }
  return (
    <>
      <Section footer="Длительность определяет, какие окна увидят клиенты.">
        {ov.services.map((s) => (
          <Cell
            key={s.id}
            title={<span className={s.active ? "" : "muted"}>{s.title}</span>}
            subtitle={`${duration(s.duration_min)}${s.active ? "" : " · скрыта"}`}
            after={rub(s.price, s.price_from)}
            onClick={() => setEdit(s)}
            chevron
          />
        ))}
      </Section>
      <MainButton text="＋ Добавить услугу" onClick={() => setEdit({ duration_min: 60, price: 0, active: true, sort: ov.services.length })} />
    </>
  );
}

// ---------------- График ----------------

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function ScheduleTab({ ov, reload, toast }: Ctx) {
  const b = ov.business;
  const active = ov.staff.filter((s) => s.active);
  const [staffId, setStaffId] = useState<number>(active[0]?.id);
  const staff = ov.staff.find((s) => s.id === staffId) ?? active[0];
  const [hours, setHours] = useState<Record<string, [string, string][]>>(staff?.work_hours ?? {});
  useEffect(() => setHours(staff?.work_hours ?? {}), [staffId]);
  const timeOff = useLoad<any[]>(() => api("admin.timeOff", { businessId: b.id }), []);
  const [off, setOff] = useState({ dateFrom: todayIn(b.timezone), dateTo: "", timeFrom: "", timeTo: "", reason: "", all: true });

  const setDay = (d: number, v: [string, string][] | null) => {
    const next = { ...hours };
    if (v) next[String(d)] = v;
    else delete next[String(d)];
    setHours(next);
  };

  return (
    <>
      {active.length > 1 && (
        <Select label={b.settings.labels.staff} value={String(staffId)} onChange={(v) => setStaffId(Number(v))} options={active.map((s) => [String(s.id), s.name])} />
      )}
      <Section title="Рабочие часы" footer="Можно добавить перерыв: два интервала в день.">
        {WD.map((name, i) => {
          const d = i + 1;
          const intervals = hours[String(d)];
          return (
            <div key={d} className="wh-row">
              <label className="wh-day">
                <input type="checkbox" checked={Boolean(intervals)} onChange={(e) => setDay(d, e.target.checked ? [["10:00", "19:00"]] : null)} />
                {name}
              </label>
              {intervals ? (
                <div className="wh-intervals">
                  {intervals.map(([f, t], j) => (
                    <div key={j} className="wh-int">
                      <TimeSelect value={f} onChange={(v) => setDay(d, intervals.map((x, k) => (k === j ? [v, x[1]] : x)))} />
                      –
                      <TimeSelect value={t} onChange={(v) => setDay(d, intervals.map((x, k) => (k === j ? [x[0], v] : x)))} />
                      {j > 0 ? (
                        <button className="icon-btn" onClick={() => setDay(d, intervals.filter((_, k) => k !== j))}><Icon name="close" size={16} /></button>
                      ) : (
                        intervals.length < 3 && (
                          <button className="icon-btn" onClick={() => setDay(d, [...intervals, [intervals.at(-1)![1] < "21:00" ? intervals.at(-1)![1] : "20:00", "21:00"]])}>
                            ＋
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="muted small">выходной</span>
              )}
            </div>
          );
        })}
        <div className="pad">
          <button
            className="btn btn-primary btn-block"
            onClick={async () => {
              try {
                await api("admin.saveStaff", { businessId: b.id, staff: { ...staff, work_hours: hours } });
                haptic("success");
                toast("График сохранён");
                reload();
              } catch (e: any) {
                await alertMsg(e.message);
              }
            }}
          >
            Сохранить график
          </button>
        </div>
      </Section>

      <Section title="Закрыть время (выходной, отпуск, перерыв)">
        <div className="form">
          <div className="row2">
            <Field label="С даты" type="date" value={off.dateFrom} onChange={(v) => setOff({ ...off, dateFrom: v })} />
            <Field label="По дату" type="date" value={off.dateTo} onChange={(v) => setOff({ ...off, dateTo: v })} hint="пусто — один день" />
          </div>
          <div className="row2">
            <label className="field">
              <span className="field-label">С (время)</span>
              <TimeSelect allowEmpty value={off.timeFrom} onChange={(v) => setOff({ ...off, timeFrom: v })} />
              <span className="field-hint">«—» — весь день</span>
            </label>
            <label className="field">
              <span className="field-label">До (время)</span>
              <TimeSelect allowEmpty value={off.timeTo} onChange={(v) => setOff({ ...off, timeTo: v })} />
            </label>
          </div>
          <Field label="Причина (для себя)" value={off.reason} onChange={(v) => setOff({ ...off, reason: v })} placeholder="Отпуск" />
          {active.length > 1 && <Toggle label={`Для всех: ${b.settings.labels.staffPlural.toLowerCase()}`} checked={off.all} onChange={(v) => setOff({ ...off, all: v })} />}
          <button
            className="btn btn-secondary btn-block"
            onClick={async () => {
              try {
                const res: any = await api("admin.addTimeOff", {
                  businessId: b.id,
                  staffId: off.all || active.length < 2 ? null : staffId,
                  dateFrom: off.dateFrom,
                  dateTo: off.dateTo,
                  timeFrom: off.timeFrom,
                  timeTo: off.timeTo,
                  reason: off.reason,
                });
                haptic("success");
                if (res.conflicts) await alertMsg(`Готово. Внимание: на это время уже есть записи (${res.conflicts}) — их нужно отменить или перенести вручную.`);
                else toast("Время закрыто");
                timeOff.reload();
              } catch (e: any) {
                await alertMsg(e.message);
              }
            }}
          >
            <Icon name="lock" size={16} /> Закрыть для записи
          </button>
        </div>
        {(timeOff.data ?? []).map((t) => (
          <Cell
            key={t.id}
            title={`${fmtDay(t.starts_at, b.timezone)} ${fmtTime(t.starts_at, b.timezone)} — ${fmtDay(t.ends_at, b.timezone)} ${fmtTime(t.ends_at, b.timezone)}`}
            subtitle={[t.reason, t.staff_name ?? (active.length > 1 ? "для всех" : "")].filter(Boolean).join(" · ")}
            after={
              <button
                className="icon-btn"
                onClick={async () => {
                  await api("admin.removeTimeOff", { businessId: b.id, id: t.id });
                  timeOff.reload();
                }}
              >
                <Icon name="close" size={16} />
              </button>
            }
          />
        ))}
      </Section>
    </>
  );
}

// ---------------- Настройки ----------------

function SettingsEditor({ ov, reload, toast, onSaved }: Ctx & { onSaved: () => void }) {
  const b = ov.business;
  const [name, setName] = useState(b.name);
  const [tz, setTz] = useState(b.timezone);
  const [s, setS] = useState<Settings>(b.settings);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });
  const tzOptions = RU_TIMEZONES.some(([z]) => z === tz) ? RU_TIMEZONES : [[tz, tz] as [string, string], ...RU_TIMEZONES];

  return (
    <>
      <h2 className="page-title">Настройки</h2>
      <BannerEditor businessId={b.id} fileId={s.bannerFileId} onChange={(fileId) => { setS({ ...s, bannerFileId: fileId }); reload(); }} />
      <LogoEditor
        businessId={b.id}
        name={name}
        fileId={s.logoFileId}
        mode={s.logoMode || "circle"}
        onChange={(logoFileId, logoMode) => {
          setS({ ...s, logoFileId, logoMode });
          reload();
        }}
      />
      <PaletteEditor
        businessId={b.id}
        value={s.palette || "rose"}
        mode={s.paletteMode || "dark"}
        hasBanner={!!s.bannerFileId}
        tone={s.bannerColor || ""}
        onChange={(palette, paletteMode) => {
          setS({ ...s, palette, paletteMode });
          reload();
        }}
      />
      <IconStyleEditor
        businessId={b.id}
        value={s.iconStyle || "regular"}
        onChange={(iconStyle) => {
          setS({ ...s, iconStyle });
          reload();
        }}
      />
      <Section title="Карточка бизнеса">
        <div className="form">
          <div className="form-row">
            <Field label="Название" value={name} onChange={setName} />
          </div>
          <Field label="Описание" value={s.description} onChange={(v) => set("description", v)} multiline />
          <Field label="Приветствие в боте" value={s.welcome} onChange={(v) => set("welcome", v)} multiline />
          <Field label="Адрес" value={s.address} onChange={(v) => set("address", v)} placeholder="Самара, ул. Ленинградская, 1" />
          <Field label="Телефон для связи" value={s.contactPhone} onChange={(v) => set("contactPhone", v)} inputMode="tel" />
          <Field
            label="Текст после записи"
            value={s.afterBookingText}
            onChange={(v) => set("afterBookingText", v)}
            multiline
            placeholder="Например: предоплата 500 ₽ на карту, вход со двора"
          />
        </div>
      </Section>

      <Section title="Ссылки (Instagram, VK, канал)">
        <div className="form">
          {s.links.map((l, i) => (
            <div key={i} className="row2">
              <Field label="Название" value={l.title} onChange={(v) => set("links", s.links.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
              <Field label="Ссылка" value={l.url} onChange={(v) => set("links", s.links.map((x, j) => (j === i ? { ...x, url: v } : x)))} inputMode="url" placeholder="https://" />
            </div>
          ))}
          {s.links.length < 6 && (
            <button className="btn btn-secondary btn-small" onClick={() => set("links", [...s.links, { title: "", url: "https://" }])}>
              ＋ Ссылка
            </button>
          )}
        </div>
      </Section>

      <Section title="Правила записи">
        <div className="form">
          <Select
            label="Шаг сетки времени"
            value={String(s.stepMin)}
            onChange={(v) => set("stepMin", Number(v))}
            options={[10, 15, 20, 30, 45, 60, 90, 120].map((m) => [String(m), duration(m)])}
          />
          <Select
            label="Минимум до записи"
            value={String(s.minLeadMin)}
            onChange={(v) => set("minLeadMin", Number(v))}
            options={[0, 30, 60, 120, 180, 360, 720, 1440].map((m) => [String(m), m ? duration(m) : "можно сразу"])}
          />
          <Select
            label="Запись вперёд на"
            value={String(s.maxDaysAhead)}
            onChange={(v) => set("maxDaysAhead", Number(v))}
            options={[7, 14, 21, 30, 45, 60, 90].map((d) => [String(d), `${d} дней`])}
          />
          <Select
            label="Отмена клиентом не позже чем за"
            value={String(s.cancelHours)}
            onChange={(v) => set("cancelHours", Number(v))}
            options={[0, 1, 2, 3, 6, 12, 24, 48].map((h) => [String(h), h ? `${h} ч` : "в любой момент"])}
          />
          <Select label="Часовой пояс" value={tz} onChange={setTz} options={tzOptions} />
          <Toggle label="Клиент выбирает мастера" checked={s.chooseStaff} onChange={(v) => set("chooseStaff", v)} />
          <Toggle label="Телефон обязателен" checked={s.requirePhone} onChange={(v) => set("requirePhone", v)} />
          <Toggle
            label="Напоминать за 2 часа"
            checked={s.remind2h}
            onChange={(v) => set("remind2h", v)}
            hint="Работает, если включены частые напоминания на сервере"
          />
        </div>
      </Section>

      <Section title="Анкета при записи" footer="Например: марка авто, класс ученика, пожелания.">
        <div className="form">
          {s.fields.map((f, i) => (
            <div key={i} className="field-card">
              <Field label="Вопрос" value={f.label} onChange={(v) => set("fields", s.fields.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
              <Field label="Подсказка" value={f.placeholder ?? ""} onChange={(v) => set("fields", s.fields.map((x, j) => (j === i ? { ...x, placeholder: v } : x)))} />
              <Toggle label="Обязательно" checked={f.required} onChange={(v) => set("fields", s.fields.map((x, j) => (j === i ? { ...x, required: v } : x)))} />
              <button className="btn btn-small btn-danger" onClick={() => set("fields", s.fields.filter((_, j) => j !== i))}>
                Удалить вопрос
              </button>
            </div>
          ))}
          {s.fields.length < 6 && (
            <button
              className="btn btn-secondary btn-small"
              onClick={() => set("fields", [...s.fields, { key: `f${Date.now() % 100000}`, label: "", placeholder: "", required: false }])}
            >
              ＋ Вопрос
            </button>
          )}
        </div>
      </Section>

      <Section title="Термины">
        <div className="form">
          <div className="row2">
            <Field label="Исполнитель" value={s.labels.staff} onChange={(v) => set("labels", { ...s.labels, staff: v })} placeholder="Мастер" />
            <Field label="Во мн. числе" value={s.labels.staffPlural} onChange={(v) => set("labels", { ...s.labels, staffPlural: v })} placeholder="Мастера" />
          </div>
          <Field label="Услуга называется" value={s.labels.service} onChange={(v) => set("labels", { ...s.labels, service: v })} placeholder="Услуга" />
        </div>
      </Section>

      <MainButton
        text="Сохранить"
        onClick={async () => {
          try {
            await api("admin.saveSettings", { businessId: b.id, name, timezone: tz, settings: s });
            haptic("success");
            toast("Сохранено");
            reload();
            onSaved();
          } catch (e: any) {
            await alertMsg(e.message);
          }
        }}
      />
    </>
  );
}

// ---------------- Мастера ----------------

function StaffEditor({ ov, reload, toast }: Ctx) {
  const b = ov.business;
  const [edit, setEdit] = useState<Partial<Staff> | null>(null);
  const L = b.settings.labels;
  if (edit) {
    return (
      <>
        <h2 className="page-title">{edit.id ? edit.name : `Новый: ${L.staff.toLowerCase()}`}</h2>
        {edit.id ? (
          <StaffPhoto businessId={b.id} staff={edit as Staff} onChange={(photo_file_id) => (setEdit({ ...edit, photo_file_id }), reload())} />
        ) : (
          <p className="muted pad">Фото можно добавить после сохранения.</p>
        )}
        <Section footer="Telegram ID можно узнать у @userinfobot. Тогда записи к этому мастеру будут приходить ему в личку.">
          <div className="form">
            <Field label="Имя" value={edit.name ?? ""} onChange={(v) => setEdit({ ...edit, name: v })} required />
            <Field label="Описание" value={edit.description ?? ""} onChange={(v) => setEdit({ ...edit, description: v })} placeholder="Топ-мастер, стаж 5 лет" />
            <Field label="Telegram ID (необязательно)" value={edit.tg_id ?? ""} onChange={(v) => setEdit({ ...edit, tg_id: v ? Number(v.replace(/\D/g, "")) : null })} inputMode="numeric" />
            <Toggle label="Принимает записи" checked={edit.active !== false} onChange={(v) => setEdit({ ...edit, active: v })} />
          </div>
        </Section>
        {edit.id && (
          <Section>
            <Cell
              title="Удалить"
              danger
              onClick={async () => {
                if (!(await confirmMsg("Удалить? Если есть история записей — будет просто скрыт."))) return;
                try {
                  await api("admin.deleteStaff", { businessId: b.id, id: edit.id });
                  setEdit(null);
                  reload();
                } catch (e: any) {
                  await alertMsg(e.message);
                }
              }}
            />
          </Section>
        )}
        <div className="pad">
          <button className="btn btn-secondary btn-block" onClick={() => setEdit(null)}>
            Отмена
          </button>
        </div>
        <MainButton
          text="Сохранить"
          onClick={async () => {
            try {
              const work_hours = edit.work_hours ?? ov.staff[0]?.work_hours ?? {};
              await api("admin.saveStaff", { businessId: b.id, staff: { ...edit, work_hours } });
              toast("Сохранено");
              setEdit(null);
              reload();
            } catch (e: any) {
              await alertMsg(e.message);
            }
          }}
        />
      </>
    );
  }
  return (
    <>
      <h2 className="page-title">{L.staffPlural}</h2>
      <Section footer={ov.staff.length > 1 && !b.settings.chooseStaff ? "Чтобы клиенты выбирали мастера, включите это в настройках." : "График каждого — во вкладке «График»."}>
        {ov.staff.map((s) => (
          <Cell key={s.id} before={<Avatar src={staffPhotoUrl(s.id, s.photo_file_id)} name={s.name} size={36} />} title={s.name} subtitle={[s.description, s.active ? "" : "не принимает записи"].filter(Boolean).join(" · ")} onClick={() => setEdit(s)} chevron />
        ))}
      </Section>
      <MainButton text={`＋ Добавить`} onClick={() => setEdit({ active: true, sort: ov.staff.length })} />
    </>
  );
}

// ---------------- Портфолио ----------------

function PortfolioEditor({ ov }: Ctx) {
  const b = ov.business;
  const { data, reload } = useLoad<{ photos: Work[]; albums: Album[] }>(() => api("admin.portfolio", { businessId: b.id }), []);
  const [busy, setBusy] = useState(false);
  // фильтры: что показываем и куда лягут новые фото
  const [albumF, setAlbumF] = useState<number | "none" | null>(null);
  const [staffF, setStaffF] = useState<number | null>(null);
  const [photo, setPhoto] = useState<Work | null>(null);
  const [album, setAlbum] = useState<Partial<Album> | null>(null);
  const photos = data?.photos ?? [];
  const albums = data?.albums ?? [];
  const staff = ov.staff.filter((x) => x.active !== false || photos.some((ph) => ph.staffId === x.id));
  const multiStaff = staff.length > 1;
  const svcTitle = (id: number | null) => ov.services.find((x) => x.id === id)?.title;
  const shown = photos.filter(
    (ph) => (albumF === null || (albumF === "none" ? ph.albumId === null : ph.albumId === albumF)) && (staffF === null || ph.staffId === staffF),
  );
  const target = [albumF && albumF !== "none" ? `альбом «${albums.find((a) => a.id === albumF)?.title}»` : "", staffF ? staff.find((x) => x.id === staffF)?.name : ""]
    .filter(Boolean)
    .join(" · ");

  const upload = async (files: File[]) => {
    if (!files.length || busy) return;
    setBusy(true);
    let cur: File | undefined;
    try {
      for (const f of files.slice(0, 10)) {
        cur = f;
        const imageBase64 = await compressImage(f);
        await api("admin.portfolioAdd", {
          businessId: b.id,
          imageBase64,
          albumId: typeof albumF === "number" ? albumF : null,
          staffId: staffF ?? (staff.length === 1 ? staff[0].id : null),
        });
      }
      haptic("success");
      reload();
    } catch (e: any) {
      logClientError("portfolioAdd", e, cur);
      await alertMsg(e.message);
      reload();
    } finally {
      setBusy(false);
    }
  };
  const pick = useImagePick(upload, true);

  if (photo) return <WorkEditor ov={ov} photo={photo} albums={albums} staff={staff} onDone={() => (setPhoto(null), reload())} />;
  if (album) return <AlbumEditor ov={ov} album={album} count={photos.filter((ph) => ph.albumId === album.id).length} onDone={(id) => (setAlbum(null), id !== undefined && setAlbumF(id), reload())} />;

  return (
    <>
      <h2 className="page-title">Портфолио</h2>
      <p className="muted pad">
        Подпишите фото, отметьте мастера и соберите работы в альбомы. Альбом, привязанный к услуге, клиент увидит при записи как «Примеры работ». До 150 фото.
      </p>

      <Section title="Альбомы" footer={albums.length ? "Нажмите на альбом, чтобы изменить название, описание или услугу." : "Например: «Маникюр» с описанием и фото — к услуге «Маникюр с покрытием»."}>
        {albums.map((a) => {
          const first = photos.find((ph) => ph.albumId === a.id);
          const n = photos.filter((ph) => ph.albumId === a.id).length;
          return (
            <Cell
              key={a.id}
              before={first ? <img className="cell-thumb" src={photoUrl(first.id)} alt="" /> : <span className="cell-thumb cell-thumb-empty"><Icon name="photo" size={18} /></span>}
              title={a.title}
              subtitle={`${svcTitle(a.serviceId) ? `к услуге «${svcTitle(a.serviceId)}»` : "без услуги"} · ${n} фото`}
              onClick={() => setAlbum(a)}
              chevron
            />
          );
        })}
        <Cell before={<Icon name="plus" size={20} />} title="Новый альбом" onClick={() => setAlbum({ title: "", description: "", serviceId: null })} />
      </Section>

      {(albums.length > 0 || multiStaff) && photos.length > 0 && (
        <div className="chips g-noswipe">
          <button className={`chip ${albumF === null ? "chip-on" : ""}`} onClick={() => setAlbumF(null)}>
            Все · {photos.length}
          </button>
          {albums.map((a) => (
            <button key={a.id} className={`chip ${albumF === a.id ? "chip-on" : ""}`} onClick={() => setAlbumF(albumF === a.id ? null : a.id)}>
              {a.title}
            </button>
          ))}
          {albums.length > 0 && photos.some((ph) => ph.albumId === null) && (
            <button className={`chip ${albumF === "none" ? "chip-on" : ""}`} onClick={() => setAlbumF(albumF === "none" ? null : "none")}>
              Без альбома
            </button>
          )}
        </div>
      )}
      {multiStaff && photos.length > 0 && (
        <div className="chips g-noswipe">
          {staff.map((st) => (
            <button key={st.id} className={`chip chip-ava ${staffF === st.id ? "chip-on" : ""}`} onClick={() => setStaffF(staffF === st.id ? null : st.id)}>
              <Avatar src={staffPhotoUrl(st.id, st.photo_file_id)} name={st.name} size={24} />
              {st.name}
            </button>
          ))}
        </div>
      )}

      <div className={`banner-drop ${pick.over ? "banner-drop-over" : ""}`} {...pick.drop}>
        <button className="btn btn-primary btn-block upload" disabled={busy} onClick={pick.open}>
          {busy ? "Загружаю…" : "＋ Добавить фото"}
        </button>
        {target && <div className="muted small upload-target">Добавятся в: {target}</div>}
        {pick.input}
      </div>
      {!data && <Spinner />}
      <div className="gallery gallery-grid">
        {shown.map((ph) => (
          <button key={ph.id} className="gallery-item gallery-edit" onClick={() => setPhoto(ph)}>
            <img src={photoUrl(ph.id)} alt="" loading="lazy" />
            {ph.caption ? <span className="gallery-cap">{ph.caption}</span> : <span className="gallery-cap gallery-cap-empty">＋ подпись</span>}
          </button>
        ))}
      </div>
      {data && !photos.length && <Empty icon={<Icon name="photo" size={40} />} title="Пока пусто" text="Добавьте 6–12 лучших работ — так клиенты записываются охотнее." />}
      {data && photos.length > 0 && !shown.length && <Empty title="Здесь пока нет фото" text="Добавьте фото кнопкой выше — они сразу попадут сюда." />}
    </>
  );
}

/** Одно фото: подпись, мастер, альбом, удалить. */
function WorkEditor(p: { ov: Overview; photo: Work; albums: Album[]; staff: Staff[]; onDone: () => void }) {
  const b = p.ov.business;
  const [caption, setCaption] = useState(p.photo.caption);
  const [staffId, setStaffId] = useState(p.photo.staffId ? String(p.photo.staffId) : "");
  const [albumId, setAlbumId] = useState(p.photo.albumId ? String(p.photo.albumId) : "");
  return (
    <>
      <h2 className="page-title">Фото</h2>
      <div className="work-preview">
        <img src={photoUrl(p.photo.id)} alt="" />
      </div>
      <Section footer="Подпись клиент увидит под фото, когда откроет его крупно.">
        <div className="form">
          <Field label="Подпись" value={caption} onChange={setCaption} multiline placeholder="Например: нюдовый маникюр с втиркой" />
          {p.staff.length > 0 && <Select label="Чья работа" value={staffId} onChange={setStaffId} options={[["", "Не указано"], ...p.staff.map((x) => [String(x.id), x.name] as [string, string])]} />}
          <Select label="Альбом" value={albumId} onChange={setAlbumId} options={[["", "Без альбома"], ...p.albums.map((a) => [String(a.id), a.title] as [string, string])]} />
        </div>
      </Section>
      <Section>
        <Cell
          title="Удалить фото"
          danger
          onClick={async () => {
            if (!(await confirmMsg("Удалить фото из портфолио?"))) return;
            await api("admin.portfolioRemove", { businessId: b.id, id: p.photo.id });
            p.onDone();
          }}
        />
      </Section>
      <div className="pad">
        <button className="btn btn-secondary btn-block" onClick={p.onDone}>
          Отмена
        </button>
      </div>
      <MainButton
        text="Сохранить"
        onClick={async () => {
          try {
            await api("admin.portfolioUpdate", { businessId: b.id, id: p.photo.id, caption, staffId: staffId || null, albumId: albumId || null });
            haptic("success");
            p.onDone();
          } catch (e: any) {
            await alertMsg(e.message);
          }
        }}
      />
    </>
  );
}

/** Альбом: название, описание и услуга, к которой он показывается как «Примеры работ». */
function AlbumEditor(p: { ov: Overview; album: Partial<Album>; count: number; onDone: (openId?: number | null) => void }) {
  const b = p.ov.business;
  const [a, setA] = useState(p.album);
  return (
    <>
      <h2 className="page-title">{a.id ? "Альбом" : "Новый альбом"}</h2>
      <Section footer="Если выбрать услугу, клиент при записи на неё увидит фото этого альбома как «Примеры работ», а в «Работах» — описание и кнопку записи.">
        <div className="form">
          <Field label="Название" value={a.title ?? ""} onChange={(v) => setA({ ...a, title: v })} required placeholder="Маникюр" />
          <Field label="Описание" value={a.description ?? ""} onChange={(v) => setA({ ...a, description: v })} multiline placeholder="Что входит, какие материалы, сколько держится" />
          <Select
            label="Услуга"
            value={a.serviceId ? String(a.serviceId) : ""}
            onChange={(v) => setA({ ...a, serviceId: v ? Number(v) : null })}
            options={[["", "Без услуги"], ...p.ov.services.map((x) => [String(x.id), x.title] as [string, string])]}
          />
        </div>
      </Section>
      {a.id && (
        <Section footer={p.count ? `Фото (${p.count}) останутся в портфолио, просто без альбома.` : undefined}>
          <Cell
            title="Удалить альбом"
            danger
            onClick={async () => {
              if (!(await confirmMsg("Удалить альбом? Фото останутся в портфолио."))) return;
              await api("admin.albumRemove", { businessId: b.id, id: a.id });
              p.onDone(null);
            }}
          />
        </Section>
      )}
      <div className="pad">
        <button className="btn btn-secondary btn-block" onClick={() => p.onDone()}>
          Отмена
        </button>
      </div>
      <MainButton
        text={a.id ? "Сохранить" : "Создать альбом"}
        onClick={async () => {
          try {
            const res: any = await api("admin.albumSave", { businessId: b.id, album: a });
            haptic("success");
            // новый альбом сразу открываем фильтром — следующие фото лягут в него
            p.onDone(a.id ? undefined : Number(res.id));
          } catch (e: any) {
            await alertMsg(e.message);
          }
        }}
      />
    </>
  );
}

// ---------------- Клиенты ----------------

function ClientsList({ ov }: Ctx) {
  const { data, error, reload } = useLoad<any[]>(() => api("admin.clients", { businessId: ov.business.id }), []);
  const [q, setQ] = useState("");
  const list = (data ?? []).filter((c) => !q || `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h2 className="page-title">Клиенты {data ? `· ${data.length}` : ""}</h2>
      <div className="pad">
        <input className="search" placeholder="Поиск по имени или телефону" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <ErrorBox error={error} onRetry={reload} />}
      {!data && !error && <Spinner />}
      <Section>
        {list.map((c) => (
          <Cell
            key={c.tg_id}
            title={
              <a className="link" href={`tg://user?id=${c.tg_id}`}>
                {c.name || "Без имени"}
              </a>
            }
            subtitle={[c.phone, c.tg_ids?.length > 1 ? `${c.tg_ids.length} аккаунта, один номер` : "", c.blocked_bot ? "заблокировал бота" : ""].filter(Boolean).join(" · ")}
            after={<span className="muted small">{c.visits} зап.</span>}
          />
        ))}
      </Section>
      {data && !data.length && <Empty icon={<Icon name="contacts" size={40} />} title="Клиентов пока нет" text="Поделитесь ссылкой — каждый, кто откроет запись, появится здесь." />}
    </>
  );
}

// ---------------- Рассылка ----------------

function Broadcast({ ov }: Ctx) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  return (
    <>
      <h2 className="page-title">Рассылка клиентам</h2>
      <p className="muted pad">
        Сообщение получат все, кто открывал вашу запись ({ov.stats.clients}). Не чаще раза в 6 часов — частые рассылки заставляют блокировать бота.
      </p>
      <Section>
        <div className="form">
          <Field label="Текст" value={text} onChange={setText} multiline placeholder="Есть свободные окна на эту субботу! Скидка 10% по записи до пятницы" />
        </div>
      </Section>
      {result && (
        <Empty icon={<Icon name="send" size={40} />} title={`Отправлено: ${result.sent}`} text={result.failed ? `Не доставлено: ${result.failed} (заблокировали бота)` : undefined} />
      )}
      {!result && (
        <MainButton
          text="Отправить"
          disabled={text.trim().length < 3}
          onClick={async () => {
            if (!(await confirmMsg(`Отправить сообщение ${ov.stats.clients} клиентам?`))) return;
            try {
              setResult(await api("admin.broadcast", { businessId: ov.business.id, text }));
              haptic("success");
            } catch (e: any) {
              await alertMsg(e.message);
            }
          }}
        />
      )}
    </>
  );
}

// ---------------- Админы ----------------

function Admins({ ov, reload, toast }: Ctx) {
  const b = ov.business;
  const [link, setLink] = useState<string | null>(null);
  return (
    <>
      <h2 className="page-title">Администраторы</h2>
      <Section>
        {ov.admins.map((a) => (
          <Cell
            key={a.tg_id}
            before={<Icon name={a.role === "owner" ? "crown" : "shield"} size={20} />}
            title={a.first_name || `ID ${a.tg_id}`}
            subtitle={`${a.role === "owner" ? "владелец" : "администратор"}${a.username ? ` · @${a.username}` : ""}`}
            after={
              ov.role !== "admin" && (
                <button
                  className="icon-btn"
                  onClick={async () => {
                    if (!(await confirmMsg("Убрать доступ?"))) return;
                    try {
                      await api("admin.removeAdmin", { businessId: b.id, tgId: a.tg_id });
                      reload();
                    } catch (e: any) {
                      await alertMsg(e.message);
                    }
                  }}
                >
                  <Icon name="close" size={16} />
                </button>
              )
            }
          />
        ))}
      </Section>
      {link ? (
        <Section title="Ссылка-приглашение (одноразовая, 30 дней)">
          <div className="pad">
            <div className="linkbox">{link}</div>
            <div className="row2">
              <button className="btn btn-secondary" onClick={async () => (await copy(link)) && toast("Скопировано")}>Копировать</button>
              <button className="btn btn-primary" onClick={() => shareLink(link, `Приглашение в управление «${b.name}»`)}>Отправить</button>
            </div>
          </div>
        </Section>
      ) : (
        <MainButton
          text="＋ Пригласить администратора"
          onClick={async () => {
            const r: any = await api("admin.invite", { businessId: b.id, role: "admin" });
            setLink(r.link);
          }}
        />
      )}
    </>
  );
}

// ---------------- Ссылка и QR ----------------

// ---------------- Баннер ----------------

/** Выбор фото: кнопка открывает выбор файла; на компьютере можно ещё перетащить файл или вставить Ctrl+V. */
function useImagePick(onFiles: (files: File[]) => void, multiple = false) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (list: FileList | null | undefined) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif)$/i.test(f.name));
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  const cb = useRef(take);
  cb.current = take;
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea")) return;
      if (e.clipboardData?.files?.length) {
        e.preventDefault();
        cb.current(e.clipboardData.files);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);
  return {
    open: () => ref.current?.click(),
    over,
    input: (
      <input
        ref={ref}
        className="file-input"
        type="file"
        accept="image/*"
        multiple={multiple}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          take(e.target.files);
          e.target.value = ""; // тот же файл можно выбрать ещё раз
        }}
      />
    ),
    drop: {
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      },
    },
  };
}

/** Фото мастера: клиент видит его при выборе мастера, в «Работах» и на карточке «Вы записаны». */
function StaffPhoto(p: { businessId: number; staff: Staff; onChange: (fileId: string) => void }) {
  const [busy, setBusy] = useState(false);
  const upload = async ([f]: File[]) => {
    if (!f || busy) return;
    setBusy(true);
    try {
      const imageBase64 = await compressImage(f, 800);
      const res: any = await api("admin.staffPhotoSet", { businessId: p.businessId, staffId: p.staff.id, imageBase64 });
      haptic("success");
      p.onChange(res.photo);
    } catch (e: any) {
      logClientError("staffPhotoSet", e, f);
      await alertMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  const pick = useImagePick(upload);
  const url = staffPhotoUrl(p.staff.id, p.staff.photo_file_id);
  return (
    <div className={`staff-photo banner-drop ${pick.over ? "banner-drop-over" : ""}`} {...pick.drop}>
      <Avatar src={url} name={p.staff.name || "?"} size={88} />
      <div className="staff-photo-side">
        <div className="muted small">Фото видно клиенту при выборе мастера, в «Работах» и на карточке записи. Лучше портрет, лицо по центру.</div>
        <div className="banner-actions">
          <button className="btn btn-secondary btn-small" disabled={busy} onClick={pick.open}>
            {busy ? "Загружаю…" : url ? "Заменить" : "＋ Фото"}
          </button>
          {url && (
            <button
              className="btn btn-danger btn-small"
              onClick={async () => {
                await api("admin.staffPhotoRemove", { businessId: p.businessId, staffId: p.staff.id });
                p.onChange("");
              }}
            >
              Убрать
            </button>
          )}
        </div>
      </div>
      {pick.input}
    </div>
  );
}

/** Логотип: показывать кругом над названием или вместо названия. Применяется сразу. */
function LogoEditor(p: { businessId: number; name: string; fileId?: string; mode: "circle" | "wordmark"; onChange: (fileId: string, mode: "circle" | "wordmark") => void }) {
  const [busy, setBusy] = useState(false);
  const url = logoUrl(p.businessId, p.fileId);
  const upload = async ([f]: File[]) => {
    if (!f || busy) return;
    setBusy(true);
    try {
      const imageBase64 = await compressImage(f, 900, true);
      const res: any = await api("admin.logoSet", { businessId: p.businessId, imageBase64 });
      haptic("success");
      p.onChange(res.settings.logoFileId, p.mode);
    } catch (e: any) {
      logClientError("logoSet", e, f);
      await alertMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  const setMode = async (mode: "circle" | "wordmark") => {
    if (mode === p.mode) return;
    haptic();
    try {
      await api("admin.saveSettings", { businessId: p.businessId, settings: { logoMode: mode } });
      p.onChange(p.fileId ?? "", mode);
    } catch (e: any) {
      await alertMsg(e.message);
    }
  };
  const pick = useImagePick(upload);
  return (
    <Section
      title="Логотип"
      footer="Лучше всего — PNG с прозрачным фоном. «Значок» — для круглого логотипа или фото, «Вместо названия» — для логотипа-надписи."
    >
      <div className={`banner-drop ${pick.over ? "banner-drop-over" : ""}`} {...pick.drop}>
        {url && (
          <div className="logo-modes">
            {(
              [
                ["circle", "Значок над названием"],
                ["wordmark", "Вместо названия"],
              ] as const
            ).map(([m, label]) => (
              <button key={m} className={`logo-mode ${p.mode === m ? "on" : ""}`} onClick={() => setMode(m)} aria-pressed={p.mode === m}>
                <span className="logo-mode-pv">
                  {m === "circle" ? (
                    <>
                      <span className="logo-circle">
                        <img src={url} alt="" />
                      </span>
                      <b>{p.name}</b>
                    </>
                  ) : (
                    <img className="logo-word" src={url} alt="" />
                  )}
                </span>
                <span className="logo-mode-label">{label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="banner-actions">
          <button className="btn btn-secondary btn-small" disabled={busy} onClick={pick.open}>
            {busy ? "Загружаю…" : url ? "Заменить логотип" : "＋ Загрузить логотип"}
          </button>
          {url && (
            <button
              className="btn btn-danger btn-small"
              onClick={async () => {
                if (!(await confirmMsg("Убрать логотип?"))) return;
                await api("admin.logoRemove", { businessId: p.businessId });
                p.onChange("", p.mode);
              }}
            >
              Убрать
            </button>
          )}
        </div>
        {pick.input}
      </div>
    </Section>
  );
}

function BannerEditor(p: { businessId: number; fileId?: string; onChange: (fileId: string) => void }) {
  const [busy, setBusy] = useState(false);
  const url = bannerUrl(p.businessId, p.fileId);
  const upload = async ([f]: File[]) => {
    if (!f || busy) return;
    setBusy(true);
    try {
      const [imageBase64, color] = await Promise.all([compressImage(f, 1600), dominantColorOfFile(f)]);
      const res: any = await api("admin.bannerSet", { businessId: p.businessId, imageBase64, color });
      haptic("success");
      p.onChange(res.settings.bannerFileId);
    } catch (e: any) {
      logClientError("bannerSet", e, f);
      await alertMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  const pick = useImagePick(upload);
  return (
    <Section title="Обложка на главной" footer="Горизонтальное фото — шапка вашей страницы: сверху и снизу оно мягко растворится в цвете страницы. На компьютере фото можно перетащить сюда или вставить (Ctrl+V).">
      <div className={`banner-drop ${pick.over ? "banner-drop-over" : ""}`} {...pick.drop}>
        {url && (
          <div className="banner-preview">
            <img src={url} alt="" />
          </div>
        )}
        <div className="banner-actions">
          <button className="btn btn-secondary btn-small" disabled={busy} onClick={pick.open}>
            {busy ? "Загружаю…" : url ? "Заменить фото" : "＋ Загрузить фото"}
          </button>
          {url && (
            <button
              className="btn btn-danger btn-small"
              onClick={async () => {
                if (!(await confirmMsg("Убрать обложку?"))) return;
                await api("admin.bannerRemove", { businessId: p.businessId });
                p.onChange("");
              }}
            >
              Убрать
            </button>
          )}
        </div>
        {pick.input}
      </div>
    </Section>
  );
}

/** Цвет страницы: режим (тёмная/светлая), цвет пятна — готовый, из обложки или свой. Применяется сразу. */
/** Живое превью палитры: маленькая страница с фоном, узором, переливающимися пятнами, заголовком и кнопкой. */
function PalettePreview(p: { g: Glow; label: string; on: boolean; busy: boolean; onClick: () => void }) {
  return (
    <button className={`pv ${p.on ? "pv-on" : ""}`} onClick={p.onClick} aria-pressed={p.on} aria-label={p.label}>
      <span className={`pv-card ${p.g.dark ? "pv-dark" : ""}`} style={glowVars(p.g) as React.CSSProperties}>
        <span className="pv-blobs" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="pv-pattern" aria-hidden />
        <span className="pv-body" aria-hidden>
          <span className="pv-name">Аа</span>
          <span className="pv-line" />
          <span className="pv-line pv-line-short" />
          <span className="pv-cta" />
        </span>
        {p.on && (
          <span className="pv-check">
            <Icon name="check" size={14} />
          </span>
        )}
      </span>
      <span className="swatch-label">{p.busy ? "…" : p.label}</span>
    </button>
  );
}

/** Стиль значков на странице для клиентов: превью из четырёх значков в каждом стиле, применяется сразу. */
function IconStyleEditor(p: { businessId: number; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState("");
  const save = async (v: string) => {
    if (busy) return;
    setBusy(v);
    try {
      await api("admin.saveSettings", { businessId: p.businessId, settings: { iconStyle: v } });
      haptic("success");
      p.onChange(v);
    } catch (e: any) {
      await alertMsg(e.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <Section title="Значки" footer="Один стиль для всех значков: нижняя панель, контакты, стрелки.">
      <div className="ics">
        {ICON_STYLES.map((st) => (
          <button key={st.id} className={`ics-item ${p.value === st.id ? "ics-on" : ""}`} onClick={() => save(st.id)} aria-pressed={p.value === st.id}>
            <span className={`pv-ic ic-${st.id}`} aria-hidden>
              {["home", "calendar", "phone", "pin"].map((n) => (
                <Icon key={n} name={n} size={22} />
              ))}
            </span>
            <span className="ics-label">{busy === st.id ? "…" : st.label}</span>
            {p.value === st.id && <Icon name="check" size={18} />}
          </button>
        ))}
      </div>
    </Section>
  );
}

function PaletteEditor(p: { businessId: number; value: string; mode: "dark" | "light"; hasBanner: boolean; tone: string; onChange: (palette: string, mode: "dark" | "light") => void }) {
  const custom = /^#[0-9a-f]{6}$/i.test(p.value);
  const [own, setOwn] = useState(custom ? p.value : "#e8442c");
  const [busy, setBusy] = useState("");
  const save = async (palette: string, mode: "dark" | "light") => {
    if (busy) return;
    setBusy(palette + mode);
    try {
      await api("admin.saveSettings", { businessId: p.businessId, settings: { palette, paletteMode: mode } });
      haptic("success");
      p.onChange(palette, mode);
    } catch (e: any) {
      await alertMsg(e.message);
    } finally {
      setBusy("");
    }
  };
  type Opt = { id: string; label: string; g: Glow };
  const bright: Opt[] = [
    ...COLORS.map((c) => ({ id: c.id, label: c.label, g: glowFor(c.id, p.mode, p.tone) })),
    ...(p.hasBanner ? [{ id: "banner", label: "Из обложки", g: glowFor("banner", p.mode, p.tone) }] : []),
  ];
  const pastels: Opt[] = PASTELS.map((c) => ({ id: c.id, label: c.label, g: glowFor(c.id, "light", "") }));
  const bwOpt: Opt = { id: BW_ID, label: "Ч/Б", g: glowFor(BW_ID, p.mode, "") };
  const pastelOn = PASTELS.some((c) => c.id === p.value);
  const swatch = (o: Opt) => (
    <PalettePreview key={o.id} g={o.g} label={o.label} on={p.value === o.id} busy={busy === o.id + p.mode} onClick={() => save(o.id, p.mode)} />
  );
  return (
    <Section title="Цвет страницы" footer="Фон, кнопка «Записаться» и текучее пятно света на странице для клиентов. Нажмите — применится сразу.">
      <div className={`mode-switch ${pastelOn ? "mode-off" : ""}`} role="group" aria-label="Тёмная или светлая страница">
        {(["dark", "light"] as const).map((m) => (
          <button key={m} className={p.mode === m ? "mode-on" : ""} aria-pressed={p.mode === m} onClick={() => save(p.value, m)}>
            {m === "dark" ? "Тёмная" : "Светлая"}
          </button>
        ))}
      </div>
      {pastelOn && <p className="swatch-note">Светлые палитры всегда светлые — переключатель действует на яркие и Ч/Б.</p>}
      <p className="swatch-group">Яркие — тёмные или светлые</p>
      <div className="pv-grid">{bright.map(swatch)}</div>
      <p className="swatch-group">Светлые с узором</p>
      <div className="pv-grid">{pastels.map(swatch)}</div>
      <p className="swatch-group">Чёрно-белая</p>
      <div className="pv-grid">{swatch(bwOpt)}</div>
      <div className="swatch-own">
        <label className="swatch-own-pick">
          <input type="color" value={own} onChange={(e) => setOwn(e.target.value)} aria-label="Свой цвет" />
          <span>Свой цвет</span>
        </label>
        <button className={`btn btn-small ${custom && p.value.toLowerCase() === own.toLowerCase() ? "btn-secondary" : "btn-primary"}`} onClick={() => save(own, p.mode)}>
          {custom && p.value.toLowerCase() === own.toLowerCase() ? "Применён" : "Применить"}
        </button>
      </div>
    </Section>
  );
}

function ShareLinks({ ov, toast }: Ctx) {
  const b = ov.business;
  const [qr, setQr] = useState<string>("");
  useEffect(() => {
    QRCode.toDataURL(ov.links.client, { margin: 1, width: 640, color: { dark: "#111111", light: "#ffffff" } }).then(setQr);
  }, [ov.links.client]);
  return (
    <>
      <h2 className="page-title">Ссылка для клиентов</h2>
      <p className="muted pad">
        Поставьте её в шапку Telegram-канала, Instagram и VK, в автоответ мессенджеров. QR можно распечатать на ресепшен или визитку.
      </p>
      <div className="pad">
        <div className="linkbox">{ov.links.client}</div>
        <div className="row2">
          <button className="btn btn-secondary" onClick={async () => (await copy(ov.links.client)) && toast("Скопировано")}>Копировать</button>
          <button className="btn btn-primary" onClick={() => shareLink(ov.links.client, `${b.name} — онлайн-запись`)}>Поделиться</button>
        </div>
      </div>
      {qr && (
        <div className="qr">
          <img src={qr} alt="QR" />
          <a className="btn btn-secondary btn-small" href={qr} download={`qr-${b.slug}.png`}>
            Скачать QR
          </a>
        </div>
      )}
      {ov.links.maxClient && (
        <>
          <h2 className="page-title">Ссылка для клиентов в MAX</h2>
          <p className="muted pad">Для тех, кто пользуется MAX: откроет ту же запись прямо в MAX.</p>
          <div className="pad">
            <div className="linkbox">{ov.links.maxClient}</div>
            <button className="btn btn-secondary btn-block" onClick={async () => (await copy(ov.links.maxClient!)) && toast("Скопировано")}>
              Копировать
            </button>
          </div>
        </>
      )}
      <h2 className="page-title">Ссылка на панель управления</h2>
      <p className="muted pad">
        Для вас и ваших администраторов — сохраните её. У остальных она откроет обычную запись, прав не даёт.
        Нового администратора добавляйте через «Администраторы» → приглашение.
      </p>
      <div className="pad">
        <div className="linkbox">{ov.links.admin}</div>
        <button className="btn btn-secondary btn-block" onClick={async () => (await copy(ov.links.admin)) && toast("Скопировано")}>
          Копировать
        </button>
        {ov.links.maxAdmin && (
          <>
            <div className="linkbox" style={{ marginTop: 10 }}>{ov.links.maxAdmin}</div>
            <button className="btn btn-secondary btn-block" onClick={async () => (await copy(ov.links.maxAdmin!)) && toast("Скопировано")}>
              Копировать ссылку для MAX
            </button>
          </>
        )}
      </div>
    </>
  );
}
