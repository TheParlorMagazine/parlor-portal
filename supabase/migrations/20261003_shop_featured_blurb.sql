-- Shop hero "featured" promo. The storefront hero (the "Get our Second Issue in
-- Print!" block on /shop) is driven by the single product flagged featured = true.
-- featured_blurb holds the hero headline the admin types in Shop → Products when
-- they mark a product as featured. Only one product is featured at a time; that
-- is enforced in the admin API (setting one featured clears the others).
alter table public.shop_products add column if not exists featured_blurb text;

-- Prefill the current featured product's blurb with the previous hardcoded hero
-- headline, so the storefront reads the same after the switch to data-driven.
update public.shop_products
  set featured_blurb = E'Get our\nSecond Issue\nin Print!'
  where featured = true and (featured_blurb is null or featured_blurb = '');
