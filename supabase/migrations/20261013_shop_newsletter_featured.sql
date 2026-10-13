alter table shop_products
  add column if not exists newsletter_featured boolean not null default false;
