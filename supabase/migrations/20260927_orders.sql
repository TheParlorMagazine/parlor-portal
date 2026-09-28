-- Shop orders — physical merch/print purchases from the store. Members track
-- their order from placement through fulfillment (processing → shipped →
-- fulfilled), with carrier + tracking once it ships. We only track up to
-- fulfillment (no returns/RMA lifecycle here). Orders are created by the Stripe
-- webhook on a physical (shipping) checkout, and managed by admins/finance.
-- Service-role API access. Run once in Supabase dashboard → SQL Editor.

create table if not exists orders (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid references members(id) on delete set null,
  order_number         text unique,                    -- human-friendly, e.g. PARLOR-1042
  email                text,                           -- contact for the order (guest-safe)
  status               text not null default 'processing',  -- processing | shipped | fulfilled | cancelled
  carrier              text,                           -- USPS / UPS / FedEx / etc.
  tracking_number      text,
  tracking_url         text,                           -- direct carrier tracking link
  shipping_name        text,
  shipping_address     text,                           -- formatted, multi-line
  subtotal_cents       integer default 0,
  shipping_cents       integer default 0,
  total_cents          integer default 0,
  currency             text default 'usd',
  stripe_session_id    text unique,                    -- dedupe webhook retries
  stripe_payment_intent text,
  admin_note           text,
  placed_at            timestamptz not null default now(),
  shipped_at           timestamptz,
  fulfilled_at         timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists orders_member_idx on orders(member_id, placed_at desc);
create index if not exists orders_status_idx on orders(status, placed_at desc);

create table if not exists order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  product_name     text not null,
  variant          text,                               -- e.g. "Size L" / "Vol. 2"
  quantity         integer not null default 1,
  unit_price_cents integer default 0,
  image_url        text,
  stripe_price_id  text,
  created_at       timestamptz not null default now()
);
create index if not exists order_items_order_idx on order_items(order_id);

-- Sequence + helper backing the friendly order number (PARLOR-1000, 1001, …).
create sequence if not exists order_number_seq start with 1000;
create or replace function next_order_number() returns text
  language sql as $$ select 'PARLOR-' || nextval('order_number_seq')::text $$;
