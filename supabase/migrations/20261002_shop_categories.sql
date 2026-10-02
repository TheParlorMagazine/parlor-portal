-- Shop product categories, managed in the admin (Shop → Products). Previously a
-- hardcoded list; now a table so categories can be added, products moved between
-- them, and empty categories deleted. Products reference a category by name
-- (shop_products.category), matching the existing data.

create table if not exists public.shop_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

-- Seed the four categories that shipped hardcoded.
insert into public.shop_categories (name, sort) values
  ('Limited Edition', 0),
  ('Self Care', 1),
  ('Tea & Rituals', 2),
  ('Apparel & Accessories', 3)
on conflict (name) do nothing;

-- Public read (storefront nav); writes go through the service-role admin API.
alter table public.shop_categories enable row level security;
drop policy if exists "shop_categories public read" on public.shop_categories;
create policy "shop_categories public read" on public.shop_categories
  for select using (true);
