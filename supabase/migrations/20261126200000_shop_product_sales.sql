begin;
alter table public.shop_products
  add column sale_discount_percent integer not null default 0
  check (sale_discount_percent between 0 and 99);
comment on column public.shop_products.sale_discount_percent is
  'Whole percentage discount from the stored regular price; zero means no sale. Applies to all product variants.';
commit;
