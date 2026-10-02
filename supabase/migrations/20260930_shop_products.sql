-- Shop product catalogue. Products are managed in the admin (Shop → Products)
-- and rendered on /shop. Some products are self-fulfilled (magazines, prints);
-- others are print-on-demand via Printify (fulfillment = 'printify', linked by
-- printify_product_id). Multi-currency retail columns (price_eur/gbp) are here
-- so the geo-pricing work can fill them later without another migration.

create table if not exists public.shop_products (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  name                 text not null,
  variant              text,                         -- subtitle, e.g. "The World We're Building"
  description          text,
  category             text,                         -- Limited Edition | Self Care | Tea & Rituals | Apparel & Accessories
  price                numeric(10,2) not null default 0,   -- USD retail
  price_eur            numeric(10,2),
  price_gbp            numeric(10,2),
  images               text[] not null default '{}', -- gallery; first entry is the primary image
  tint                 text,                          -- soft placeholder colour when there is no image
  active               boolean not null default true,
  featured             boolean not null default false,
  sort                 int not null default 0,
  sku                  text,
  inventory            int,                           -- null = unlimited / print-on-demand
  fulfillment          text not null default 'manual',-- 'manual' | 'printify'
  external_url         text,                          -- link out (e.g. Wix) instead of in-app checkout
  stripe_price_id      text,
  printify_shop_id     text,
  printify_product_id  text,
  printify_variant_id  bigint,
  printify_data        jsonb,                         -- raw Printify product payload from the last sync
  variants             jsonb                          -- [{ name, printify_variant_id, price, sku, inventory }]
);

create index if not exists shop_products_active_sort_idx on public.shop_products (active, sort);
create index if not exists shop_products_printify_idx on public.shop_products (printify_product_id);

-- Public site reads active products; all writes go through the service role
-- (admin API), which bypasses RLS.
alter table public.shop_products enable row level security;
drop policy if exists "shop_products public read" on public.shop_products;
create policy "shop_products public read" on public.shop_products
  for select using (active = true);

-- keep updated_at fresh
create or replace function public.shop_products_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_shop_products_touch on public.shop_products;
create trigger trg_shop_products_touch before update on public.shop_products
  for each row execute function public.shop_products_touch();

-- Seed with the existing hardcoded storefront so /shop is populated on launch.
insert into public.shop_products (name, variant, category, price, tint, featured, sort) values
  ('The Parlor — Vol. 2', 'The World We''re Building', 'Limited Edition', 35, '#f6cdd8', true, 0),
  ('The Parlor — Vol. 1', 'Borderlands of Identity',  'Limited Edition', 35, '#e7d5c4', false, 1),
  ('Collector''s Print Set', 'Set of 3',              'Limited Edition', 38, '#dfe3ea', false, 2),
  ('Parlor Candle', 'Fig & Smoke',                    'Self Care',       32, '#e8ded0', false, 3),
  ('Hand Balm', 'Rosewater',                          'Self Care',       18, '#f4dfe6', false, 4),
  ('Silk Eye Pillow', 'Lavender',                     'Self Care',       28, '#e4e7de', false, 5),
  ('House Black Tea', '20 sachets',                   'Tea & Rituals',   16, '#e9d8c6', false, 6),
  ('Evening Herbal', 'Caffeine-free',                 'Tea & Rituals',   16, '#dde6d6', false, 7),
  ('Parlor Mug', 'Stoneware',                         'Tea & Rituals',   22, '#e6ddef', false, 8),
  ('Canvas Tote', 'Natural',                          'Apparel & Accessories', 26, '#e7e2d6', false, 9),
  ('The Parlor Tee', 'Vintage black',                 'Apparel & Accessories', 34, '#d9d9dd', false, 10),
  ('Enamel Pin', 'Mascot',                            'Apparel & Accessories', 12, '#f6d3c9', false, 11)
on conflict do nothing;
