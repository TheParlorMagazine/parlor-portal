-- A dedicated "Feature on homepage" flag for events (separate from the newsletter
-- feature flag). The homepage "Featured events" section shows toggled-on events
-- first. Run once in Supabase dashboard → SQL Editor.
alter table events add column if not exists featured_home boolean default false;
create index if not exists events_featured_home_idx on events(featured_home, starts_at);
