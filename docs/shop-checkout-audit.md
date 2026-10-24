# Shop checkout audit and rollout

## Account flow

The regular global cart already offered signup/sign-in before payment. Its API previously trusted a browser-supplied member ID and could be called directly without login. Trick-or-Treat had no account gate. Both now verify a Supabase session before creating Stripe Checkout and link the Stripe customer to the verified member. The cart uses bearer auth; standalone Trick-or-Treat uses the same Supabase session cookies. An account is free; a paid membership is not required. The earlier migrated-subscriber password-setup fix is included in this branch so imported subscribers can complete account setup. Trick-or-Treat preserves valid picks through signup and returns the buyer to the bundle for review.

Partner products with external URLs still open the partner store. Account, payment, receipt and delivery policies there are outside the Parlor checkout.

## Corrected findings

- Server catalogue prices, allowed variants, eligible bundle picks and quantities now determine Stripe amounts and fulfillment IDs. Browser-provided bundle/individual price overrides are ignored. Legacy cart entries carrying only browser-side discounts should be rebuilt from saved bundle products before checkout. Inactive products can only be selected through an active bundle that explicitly lists them.
- Shipping expands all fixed/pick-your-own bundle components, uses the selected variant and actual available address. Printify failures/missing configuration use the documented flat fallback instead of accidentally charging zero. Shippo uses actual postal details and a configured origin; missing configuration uses the existing flat fallback (500 minor currency units). Verify origin and fallback suitability before launch.
- Only a paid, completed Stripe payment creates an order or starts fulfillment. Delayed-payment success events are supported. The return page can reconcile a verified paid session if the webhook has not arrived.
- A service-only SQL transaction persists the order/items and decrements product/variant/treat stock once per Checkout session. Retries repair old order headers with no lines. Paid stock shortages are explicitly marked for admin review; stock is never made negative. Stock is checked at checkout, not reserved while payment is pending, so simultaneous different purchases can still need stock review.
- Printify receives the delivery address from Checkout or its payment intent, rather than falling back to billing details. Every selected bundle component is expanded. Submission is claimed once; uncertain outcomes are marked `needs_review`, visible in Admin Orders. Check Printify for an accepted order before resubmitting manually. An interrupted `submitting` status also needs review; it is not automatically resent.
- Order receipts use a Checkout-session deduplication key, and known rejected sends may retry safely; uncertain send outcomes do not auto-resend. Receipt delivery errors never hide a saved paid order on its confirmation page; webhook retries handle recoverable delivery failures. **Shop Order Confirmation / Receipt** is now registered as Required in Email Management, including its default preview.
- The confirmation page shows success and clears the cart only after an authenticated order lookup confirms payment and persistence. Pending/invalid returns do not empty the cart. Another user's order and shipping details cannot be read by supplying its session ID. Direct public-client access to order tables is revoked; member/staff APIs continue through the service role.

## Before deployment

Run `supabase/migrations/20261025_shop_payment_fulfillment.sql`, after the existing orders, Printify columns, Trick-or-Treat tables and Stripe email tracking migrations. Prerequisite checks run before any changes, and the migration is wrapped in a transaction so errors roll back the entire update. It is safe to re-run against the expected schema. This also seeds the receipt automation row. Deploy code and migration together; old code must not write order headers concurrently with the new fulfillment path during rollout.

Use the matching live/test Stripe keys and webhook secret; subscribe `/api/webhooks/stripe` to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Verify Resend sender authorization, Printify token/shop, Shippo origin, catalogue prices/variants/stock and shipping destinations. Printify production approval is governed by the Printify shop settings, which were not accessed during this audit.

Use Stripe test mode and mocked/sandbox fulfillment before enabling live fulfillment: test logged-out signup/resume; an ordinary manual item; a selected variant; fixed and pick-your-own bundles; Trick-or-Treat picks; cancellation; paid return before webhook; replayed webhook; delayed success; receipt; portal order tracking and shipping/tracking notification. Inspect Admin Orders for `needs_review`/stock-review flags. No real payment, email, shipping label or Printify order was created during development.

## Validation

`NODE_PATH="$PWD/node_modules" node --experimental-vm-modules --test tests/*.test.cjs`

`python tests/shop-payment-db.py` uses disposable PostgreSQL, including concurrent retries, rollback, stock, receipt claims and role privileges.

`node tests/shop-confirmation-browser.cjs` uses the real confirmation page with isolated API/auth mocks. `node tests/cart-navigation-browser.cjs` verifies the shared cart at desktop/mobile widths. A full Next build compiles; this cloud workspace lacks the Resend key needed for page-data collection. Hosting settings and live provider delivery remain unverified.
