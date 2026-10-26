-- The code registry supplies the template and marks this receipt Required.
-- Seed its automation row so the dashboard also records send counts.
INSERT INTO public.email_automations (id, enabled, sent_count)
VALUES ('item_purchase', true, 0)
ON CONFLICT (id) DO NOTHING;
