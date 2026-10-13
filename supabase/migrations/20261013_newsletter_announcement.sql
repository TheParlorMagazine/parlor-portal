alter table issues
  add column if not exists newsletter_tagline           text,
  add column if not exists newsletter_announcement      text,
  add column if not exists newsletter_announcement_url  text;
