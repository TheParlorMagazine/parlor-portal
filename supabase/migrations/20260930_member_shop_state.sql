-- Per-member shop state so a signed-in member's cart and wishlist follow them
-- across devices. Guests keep everything in localStorage; on sign-in the two are
-- merged and then kept in sync. Service-role access only (portal API).

create table if not exists public.member_shop_state (
  member_id  uuid primary key references members(id) on delete cascade,
  cart       jsonb not null default '[]',      -- [{ id, vid }]
  wishlist   jsonb not null default '[]',      -- [product_id, …]
  updated_at timestamptz not null default now()
);

alter table public.member_shop_state enable row level security;
-- No policies: only the service role (portal API) reads/writes this.
