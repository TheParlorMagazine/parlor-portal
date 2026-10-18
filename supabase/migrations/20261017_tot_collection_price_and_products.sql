-- Add pricing + shipping copy to collections
alter table tot_collections
  add column if not exists price        numeric(10,2),
  add column if not exists price_eur    numeric(10,2),
  add column if not exists price_gbp    numeric(10,2),
  add column if not exists ship_line    text;

-- Standalone products always included in every bundle from this collection
-- (e.g. the branded tote bag, a handwritten card, etc.)
create table if not exists tot_collection_products (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references tot_collections(id) on delete cascade,
  product_id    uuid references shop_products(id) on delete set null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists tot_cp_col_idx on tot_collection_products(collection_id);

-- RLS: same read policy as other tot_* tables
alter table tot_collection_products enable row level security;
create policy "public read tot_collection_products"
  on tot_collection_products for select using (true);
