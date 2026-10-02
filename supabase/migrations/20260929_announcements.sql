-- Site announcements shown in the homepage bottom ribbon (rotating). Covers
-- issue launches, events, fundraising pushes, and campaigns — all admin-managed.
-- Run once in Supabase dashboard → SQL Editor.
create table if not exists announcements (
  id          uuid primary key default gen_random_uuid(),
  kicker      text,                              -- small eyebrow line, e.g. "Our second issue is here"
  headline    text,                              -- e.g. "Join us as it unfolds"
  message     text,                              -- body line
  cta_label   text,                              -- button text, e.g. "Become a paid subscriber"
  cta_href    text,                              -- button link, e.g. "/plans"
  type        text not null default 'general',   -- issue | event | fundraiser | campaign | general
  active      boolean not null default true,
  sort        integer not null default 0,        -- lower = earlier in the rotation
  starts_at   timestamptz,                        -- optional schedule window (null = always)
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists announcements_active_idx on announcements(active, sort);

-- Seed the current "second issue" ribbon so nothing disappears on first deploy.
insert into announcements (kicker, headline, message, cta_label, cta_href, type, sort)
select 'Our second issue is here', 'Join us as it unfolds',
       'Sustain the work and receive full access, early releases, and subscriber-only extras.',
       'Become a paid subscriber', '/plans', 'issue', 0
where not exists (select 1 from announcements);
