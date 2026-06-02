-- Seed: welcome email template (sourced from lib/emails.js)
-- Run once in Supabase dashboard → Database → SQL Editor
-- Inserts only if no welcome template already exists.

insert into email_templates (id, name, template_type, subject, body, body_html, last_edited_at, created_at)
select
  gen_random_uuid(),
  'Welcome Email',
  'welcome',
  'Welcome to The Parlor',
  '<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;"><div style="margin-bottom:32px;"><img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" width="48" height="48" style="border-radius:50%;" /></div><h1 style="font-size:28px;font-weight:700;margin-bottom:8px;line-height:1.2;">Welcome to The Parlor, {{name}}.</h1><p style="font-size:16px;line-height:1.7;color:#444;margin-bottom:24px;">We''re glad you''re here. The Parlor is a space for slow reading, critical thinking, and community — and you''re now part of it.</p><p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:32px;">Your account is ready. Head to your dashboard to explore the library, join the reading room, and see what''s coming up.</p><a href="https://parlor-portal.vercel.app/dashboard" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">Go to your dashboard →</a><div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;"><p style="font-size:12px;color:#888;line-height:1.6;">The Parlor Magazine · <a href="https://www.theparlormagazine.com" style="color:#888;">theparlormagazine.com</a></p></div></div>',
  '<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#0a0a0a;"><div style="margin-bottom:32px;"><img src="https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png" width="48" height="48" style="border-radius:50%;" /></div><h1 style="font-size:28px;font-weight:700;margin-bottom:8px;line-height:1.2;">Welcome to The Parlor, {{name}}.</h1><p style="font-size:16px;line-height:1.7;color:#444;margin-bottom:24px;">We''re glad you''re here. The Parlor is a space for slow reading, critical thinking, and community — and you''re now part of it.</p><p style="font-size:15px;line-height:1.7;color:#444;margin-bottom:32px;">Your account is ready. Head to your dashboard to explore the library, join the reading room, and see what''s coming up.</p><a href="https://parlor-portal.vercel.app/dashboard" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 28px;font-family:Georgia,serif;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">Go to your dashboard →</a><div style="margin-top:48px;padding-top:24px;border-top:1px solid #e8d4d8;"><p style="font-size:12px;color:#888;line-height:1.6;">The Parlor Magazine · <a href="https://www.theparlormagazine.com" style="color:#888;">theparlormagazine.com</a></p></div></div>',
  now(),
  now()
where not exists (
  select 1 from email_templates where template_type = 'welcome'
);
