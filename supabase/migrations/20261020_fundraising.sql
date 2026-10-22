-- Fundraising campaigns
create table if not exists public.fundraising_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  eyebrow text,
  description text,
  hero_image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Individual donation asks
create table if not exists public.fundraising_asks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null
    references public.fundraising_campaigns(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  amount numeric(12,2),
  amount_label text,
  capacity integer check (capacity is null or capacity >= 0),
  monkeypod_url text,
  display_order integer not null default 0,
  manually_fulfilled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (campaign_id, slug)
);

-- Confirmed donations only
create table if not exists public.fundraising_contributions (
  id uuid primary key default gen_random_uuid(),
  ask_id uuid not null
    references public.fundraising_asks(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  units integer not null default 1 check (units > 0),
  source text not null default 'monkeypod',
  external_reference text,
  confirmed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- Prevent duplicate external payment references
create unique index if not exists fundraising_contributions_reference_idx
  on public.fundraising_contributions(source, external_reference)
  where external_reference is not null;

-- Restrict access to server-side service-role operations
alter table public.fundraising_campaigns enable row level security;
alter table public.fundraising_asks enable row level security;
alter table public.fundraising_contributions enable row level security;
