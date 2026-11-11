-- 004: проверенный номер, альбомы портфолио (альбом = услуга), фото по мастерам, фото мастера.
-- Идемпотентно: выполняется при каждом холодном старте (MIGRATIONS_SQL).

-- номер подтверждён мессенджером (контакт из бота или подписанный ответ requestContact) — только по нему
-- связываем аккаунты и показываем общие «Мои записи»
alter table users add column if not exists phone_verified boolean not null default false;

-- фото мастера (file_id в Telegram, как портфолио)
alter table staff add column if not exists photo_file_id text not null default '';

-- альбомы портфолио: название, описание и (необязательно) услуга, к которой это примеры работ
create table if not exists albums (
  id          bigint generated always as identity primary key,
  business_id bigint not null references businesses(id) on delete cascade,
  title       text not null,
  description text not null default '',
  service_id  bigint references services(id) on delete set null,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists albums_business on albums(business_id, sort);
alter table albums enable row level security;

-- фото портфолио: чьё (мастер) и в каком альбоме
alter table portfolio add column if not exists staff_id bigint references staff(id) on delete set null;
alter table portfolio add column if not exists album_id bigint references albums(id) on delete set null;
create index if not exists portfolio_album on portfolio(album_id);
