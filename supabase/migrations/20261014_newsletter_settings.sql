create table if not exists newsletter_settings (
  id      int primary key default 1,
  sections jsonb not null default '{}'::jsonb,
  constraint single_row check (id = 1)
);

insert into newsletter_settings (id, sections) values (1, '{}'::jsonb)
  on conflict (id) do nothing;
