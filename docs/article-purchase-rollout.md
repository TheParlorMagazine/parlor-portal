# One-time article purchases

Run `supabase/migrations/20261025_item_purchases.sql` before deployment. Receipt deduplication also uses the existing `20261021_stripe_email_tracking.sql` migration.

Stripe's webhook endpoint must point to `/api/webhooks/stripe` on the deployed site with its matching `STRIPE_WEBHOOK_SECRET`. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded` (for delayed payments). The site also verifies paid sessions directly on return, so fulfillment does not depend on webhook arrival order. The deployed site needs its existing Stripe, Supabase service-role and Resend settings.

Test using Stripe test mode: sign in as a free member, purchase a paywalled article, confirm the success message and email, reload the clean article URL, and verify access persists. Replaying the webhook and return URL must not create duplicate receipts or charges. Cancelled/unpaid sessions, another account's session, or a session for a different article must never grant access.

Older guest payments have no assigned member. If the buyer retains the Checkout session ID, the return page can recover access after sign-in with the verified email matching that payment. Otherwise locate the paid Checkout session in Stripe and provide its original article return URL with `?checkout_session_id=cs_…` privately to the buyer. Never ask the buyer to pay a second time. Do not share Checkout IDs publicly.

The confirmation email uses the existing Resend sender and Stripe email delivery tracking; inspect `stripe_email_deliveries` for rejected/failed deliveries. A mail failure does not revoke access. No real payments or emails were performed during development.
