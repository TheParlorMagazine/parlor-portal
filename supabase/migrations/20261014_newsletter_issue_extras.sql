alter table issues
  add column if not exists newsletter_section_title         text,
  add column if not exists newsletter_button_copy           text,
  add column if not exists newsletter_button_url            text,
  add column if not exists newsletter_button2_copy          text,
  add column if not exists newsletter_button2_url           text,
  add column if not exists newsletter_announcement_img      text,
  add column if not exists newsletter_announcement_title    text;
