create table if not exists tot_collections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  live        boolean not null default false,
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);

create table if not exists tot_houses (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references tot_collections(id) on delete cascade,
  name          text not null,
  description   text,
  sort_order    int  not null default 0,
  active        boolean not null default true,
  created_at    timestamptz default now()
);

create table if not exists tot_treats (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references tot_houses(id) on delete cascade,
  name        text not null,
  note        text,
  stock       int  not null default 0,
  share_img   text,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

alter table tot_collections enable row level security;
alter table tot_houses      enable row level security;
alter table tot_treats      enable row level security;

-- Anon/authenticated: read only live collections and their contents.
-- All writes go through the service-role admin API, which bypasses RLS — no write policy needed.
create policy "public read collections" on tot_collections for select using (live = true);
create policy "public read houses"      on tot_houses      for select using (true);
create policy "public read treats"      on tot_treats      for select using (true);
