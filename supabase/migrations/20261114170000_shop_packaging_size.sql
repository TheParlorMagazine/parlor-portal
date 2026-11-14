-- Product-owned packaging selection for Shippo only. Existing records must be
-- reviewed in the product editor; do not guess packaging from their category.
alter table public.shop_products
  add column if not exists packaging_size text;

alter table public.shop_products
  add constraint shop_products_packaging_size_check
  check (packaging_size is null or packaging_size in ('small', 'medium', 'large', 'media'));
