-- Editable plan display details (name, price, description, benefits) so the
-- admin can add/remove benefits without a code change. Payment processor is
-- separate. Run once in Supabase dashboard → Database → SQL Editor.

create table if not exists plans (
  key         text primary key,          -- circle | press
  label       text not null,
  price       text,
  description text,
  perks       text[] not null default '{}',
  updated_at  timestamptz not null default now()
);

insert into plans (key, label, price, description, perks) values
  ('circle', 'Reader''s Circle', '$10 / month',
   'Full digital access — all articles, audio, and exclusive member content.',
   array['Unlimited article access','Audio & video content','Early access to new issues','Member-only newsletter']),
  ('press', 'Printing Press', '$25 / month',
   'Everything in Reader''s Circle, plus the quarterly print magazine mailed to your door.',
   array['Everything in Reader''s Circle','Quarterly print magazine','Free shipping','Inaugural subscriber gift'])
on conflict (key) do nothing;
