-- Printify (print-on-demand dropshipping) link columns on the existing order
-- tables. When a shop checkout contains Printify products, the Stripe webhook
-- creates a matching Printify order and records its id/status here.

alter table public.orders
  add column if not exists printify_order_id text,
  add column if not exists printify_status   text;

alter table public.order_items
  add column if not exists shop_product_id     uuid,
  add column if not exists printify_product_id text,
  add column if not exists printify_variant_id bigint;
