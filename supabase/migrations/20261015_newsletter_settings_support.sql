alter table newsletter_settings
  add column if not exists support_title text,
  add column if not exists support_btn1  text,
  add column if not exists support_btn2  text;
