-- Editable "intro to the issue" blurb + a print-promo image for the newsletter's
-- issue section. Set them from admin → Emails → Newsletter. Pre-fills Issue 2 so
-- the promo block renders right away. Run once in Supabase → SQL Editor.
alter table issues add column if not exists newsletter_intro text;
alter table issues add column if not exists newsletter_image text;

update issues set newsletter_image = 'https://res.cloudinary.com/dmegrbq5k/image/upload/v1790524931/hil_2_nrle2h.png'
  where number = 2 and newsletter_image is null;

update issues set newsletter_intro = 'From Kantamanto''s secondhand clothing markets in Accra to Casa Pueblo''s grassroots energy sovereignty in Puerto Rico, from the ethics of community tourism to the pull toward intentional communities and communal land — Vol. 2 traces the infrastructure of collective imagination across continents: not just the world we dream of, but the deliberate, often invisible work of building it.'
  where number = 2 and newsletter_intro is null;
