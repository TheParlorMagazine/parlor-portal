-- Link each treat to exactly one shop product.
-- product_id is nullable so existing treats aren't broken; set it via the admin UI.
alter table tot_treats
  add column if not exists product_id uuid references shop_products(id) on delete set null;

create index if not exists tot_treats_product_idx on tot_treats(product_id);
