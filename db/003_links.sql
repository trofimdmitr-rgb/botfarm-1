-- Связка аккаунтов одного человека в разных мессенджерах (Telegram ↔ MAX).
-- Идемпотентно: сервер выполняет этот файл при каждом холодном старте (server/db.ts → MIGRATIONS_SQL).
alter table users add column if not exists phone text;          -- последний номер, который человек указал
alter table users add column if not exists person_id bigint;    -- общий id человека: у связанных аккаунтов одинаковый
create index if not exists users_phone on users(phone);
create index if not exists users_person on users(person_id);

-- «Это вы?»: спрашиваем ВЛАДЕЛЬЦА уже известного аккаунта (to_id), когда другой аккаунт (from_id) указал тот же номер.
-- Связываем только по «Да» — иначе кто угодно ввёл бы чужой номер и увидел чужие записи.
create table if not exists link_requests (
  id          bigserial primary key,
  from_id     bigint not null,
  to_id       bigint not null,
  phone       text not null,
  status      text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at  timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists link_requests_pair on link_requests(from_id, to_id);

-- номера из уже сделанных записей: подставляем аккаунтам, у которых номер ещё не запомнен
update users u set phone = c.phone
from (
  select distinct on (tg_id) tg_id, phone from clients
  where phone is not null and phone <> '' order by tg_id, last_seen desc
) c
where c.tg_id = u.tg_id and u.phone is null;
