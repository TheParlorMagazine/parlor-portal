# Purchase hardening and atomic reservations — 26 October 2026

Branch: `audit/parlor-production-readiness`. Builds on `64e2a8a`. This report supersedes the no-reservations and shared-cookie continuation limitations in the earlier audit reports. No production SQL, deployment, real email, order or payment was executed.

## Implemented behavior

### Availability and access

- Individual shop listings and fixed bundles must be active. Hidden/inactive component products remain intentionally purchasable through an active, validated bundle configuration or live Trick-or-Treat collection. No new component-active restriction was introduced.
- Shared `prepareShopCart` still validates server prices, positive integer quantities, cumulative stock, variants and mappings. A removed variant can no longer be accepted just because the product retains its old default ID; malformed Printify variant IDs and zero fixed-bundle quantities are rejected.
- Trick-or-Treat validates collection/house/treat availability, product/variant demand, mappings and positive prices before reserving. Its component products may remain hidden.
- Article checkout reuses `checkItemAccess`, including paid plans, team roles and individual entitlements. Database lookup failures fail closed for checkout. Unpublished/deleted/non-paywalled/mismatched-price articles cannot start payment. Verified account email is required for new article and physical checkouts.
- Open digital sessions are periodically reconciled against current article availability/price and membership access; obsolete sessions are expired, unless payment has already won the race.

### Inventory lifecycle

`shop_products.inventory`, variant `inventory` and `tot_treats.stock` remain authoritative **on-hand** stock. `checkout_reservations` is a service-only allocation/checkout ledger, not a second stock counter. Available-to-reserve is on-hand minus creating/open/processing/paid allocations. Stock displays and initial cart checks may show on-hand; the final atomic reservation decides whether checkout is allowed.

1. Server resolves prices, selections, shipping and packing snapshot. A database transaction serializes reservation/paid-stock operations, validates quantities and checks combined product/variant/treat demand against on-hand less outstanding holds.
2. The reservation stores immutable server-created Stripe parameters and a 31-minute Checkout expiration. Stripe creation uses the reservation UUID as its idempotency key. Retries use the original parameters. Multiple identical in-progress requests share the same allocation; aliases remain bound after payment, so reloading a second tab cannot create a fresh purchase after the original was consumed.
3. Checkout creation rejected with an explicit invalid-request response can release its uncreated hold. A timeout or unknown response retains the hold until reconciled. An unbound session is recovered using the same key within 23 hours; afterward the reconciler discovers existing sessions instead of creating another payment. Exhaustive discovery after the creation window can release an uncreated hold. Provider errors/search limits retain it for another attempt.
4. The scheduled job processes five oldest-checked live holds in parallel every minute. It retrieves current Stripe status. It expires overdue open sessions at Stripe and re-reads them before release. **A database timestamp alone never releases inventory.**
5. Complete but asynchronously processing payments remain allocated regardless of TTL. Confirmed failed/unpaid intents are released only after cancellation is confirmed. Processing, succeeded or capture-pending intents are never automatically cancelled to free stock. Expired/failure webhook events also re-read current Stripe state, handling out-of-order delivery.
6. Paid sessions mark the allocation paid. `record_paid_shop_order` validates session/owner/inventory against the allocation and saves order, lines, stock deductions and allocation consumption in the same transaction. Duplicate deliveries cannot deduct twice. Paid/consumed allocations ignore release attempts, regardless of age.
7. Releasing a hold never increments inventory. Cancellation of an admin order, refunds, restocking and resolution of supplier discrepancies remain separate deliberate operations.

### Checkout continuation and idempotency

- Every article intent carries its UUID, item, price and timestamp through authentication. Every shop intent saves its own immutable items, variants, quantities, shipping details and timestamp under a UUID-specific browser-storage key. The new `/checkout/shop?intent=…` relay resumes that exact snapshot, not another tab's current cart.
- Trick-or-Treat selections use UUID-specific storage and links too. Missing, expired, future-dated or different-browser shop state requires review; no unrelated purchase is guessed.
- React effect guards suppress ordinary duplicate requests. Database intent/resource matching and immutable Stripe idempotency protect across requests/tabs. The prior catch-all BNPL retry with different parameters was removed; payment methods now follow the Stripe Dashboard configuration.
- Same-origin redirect checks remain. The shared cross-tab cookie fallback was removed intentionally. Supabase confirmation emails must forward the complete explicit redirect URL. Unknown/missing redirects go home rather than auto-starting another tab's purchase.
- Existing signed-webhook validation, paid-session checks, ownership checks, unique digital entitlements, receipt ledger, stable packing snapshots and guarded Printify submission remain. Email receipt uncertainty does not revoke paid access or release allocation. Known rejection remains retryable; unknown delivery requires provider reconciliation.

## Revised migrations for review — nothing applied here

The first two production migrations are unchanged:

- `20261025_item_purchases.sql`
- `20261025_item_purchase_email_registry.sql`

Apply these **in this order**, after review and a staging rehearsal:

1. **Revised pending third migration:** `supabase/migrations/20261025_shop_payment_fulfillment.sql`. Adds strict session/JSON/item/money/inventory/treat validation, checks packing/inventory consistency, rejects conflicting session totals/payment intent/items/allocation/kind, and preserves legitimate retries. Existing missing identity/amount fields can be filled; existing non-null financial values are not overwritten. Historical header-only repair still avoids a speculative second stock deduction. Keeps transaction/preflight, RLS and service-only RPC permissions.
2. **New fourth migration:** `supabase/migrations/20261026090000_inventory_reservations.sql`. Creates the allocation ledger and service-only reservation/observation/release/digital-completion functions; replaces the paid-order function with reservation-aware atomic consumption. No changes or deletes to existing accounts, subscriptions, purchases or orders; no replacement of existing inventory fields. An immutable member UUID is retained in the ledger without introducing a foreign key that would change account-deletion behavior.

The fourth migration contains the validated paid-order function from the third plus reservation consumption. Do not reapply the third by itself after the fourth, since that would replace the reservation-aware function. Reapplying the pair in order or the fourth alone is supported. Legacy `20261025` filenames share a version prefix: use explicit reviewed SQL Editor execution, not an unreviewed automatic migration push.

## Deployment prerequisites and order — not performed

1. Back up; inspect production schema/constraints/policies; confirm the first two migrations already applied. Run both revised SQL files on an isolated schema copy and review the resulting grants/functions.
2. Plan a brief checkout cutover. Reconcile already-paid historical sessions; expire or let unpaid **pre-reservation** sessions finish/expire before accepting reserved checkouts. Old sessions have no allocations and retain compatibility fulfillment; mixing their later stock deductions with new holds can otherwise cause a shortage.
3. Review and apply the pending third migration, then the fourth, while new checkout traffic is paused. No automatic refunds, order cancellations or data deletions are part of these migrations.
4. Configure Netlify **server-only** `INVENTORY_RECONCILE_SECRET` with a strong random secret. Set `INVENTORY_RECONCILE_ORIGIN` to the site's canonical nonredirecting HTTPS origin (e.g. `https://www.theparlormagazine.com`). The scheduled function and protected API use the same secret. Existing Stripe/Supabase/Resend/Printify settings remain necessary. New checkout fails closed if reconciliation's secret is missing.
5. Configure Stripe webhook delivery for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, plus the existing subscription events. Keep the signed webhook secret unchanged unless deliberately rotating it.
6. Verify Supabase URL allowlists permit the site's `/auth/callback` with its full query string. Confirmation emails should use the supplied confirmation/RedirectTo flow and preserve the complete nested `returnTo`, including intent ID. If a custom `/auth/confirm` token-hash template is used, correctly URL-encode and forward RedirectTo into `returnTo`/`redirect_to`. Do not replace it with the site homepage. This code cannot fix a template that drops the destination. Staging must exercise a real verification email and Google callback with test payments; no provider template was changed here.
7. After separate deployment authorization, deploy the reviewed code. Netlify's new `inventory-reconciliation` scheduled function runs every minute on published production deployments; deploy previews do not run that schedule. Confirm it is enabled, the protected endpoint returns checked/failed counts, and expired test holds release. Do not use the dummy-key build artifacts from this workspace.
8. Enable new checkout traffic only after the reservation RPCs and reconciliation job are verified. Monitor failed webhooks, job failures/backlogs, creating/pending/paid holds, stock-review notes, receipt uncertainty and Printify review states.

## Remaining limits and operational risks

- Stripe and PostgreSQL cannot share a transaction. The design retains allocations on provider outages or ambiguous outcomes rather than risking resale of paid stock. Expiration is processed on the next successful reconciliation, not precisely at 31 minutes. A disabled scheduler, incorrect origin/secret, provider outage or large backlog can delay release. Restore the job/provider access; never blindly reset paid/uncertain records. The five-per-minute batch rotates checked/error rows; increase scheduling capacity deliberately if traffic requires it.
- Async payments can legitimately take days. Their stock remains allocated until Stripe reaches a definitive outcome. Manual/provider reconciliation is required for permanently inconsistent provider data; elapsed time cannot safely prove nonpayment.
- Pre-reservation sessions, manual inventory edits below live allocations, product/treat deletion and external supplier changes are not made atomic by these holds. The existing shortage-review behavior remains for those exceptional cases: keep the paid record, clamp stock at zero and suppress Printify automatic submission. Do not hard-delete sold/in-flight catalog records. No automatic refund/cancellation is performed.
- Product publication/price changes after a Stripe session was issued cannot instantly revoke an external payment page. The digital reconciler expires obsolete open sessions, but a payment may win that interval/race; retain the paid record for support rather than silently discarding it. Honor/reconcile already-paid purchases when withdrawing content.
- Cross-device shop continuation cannot recover browser-only selections; users must review their cart on the other device. Cart state is local, while allocation/payment identity is server-side. Expired saved checkout data is rejected/removed when read.
- Historical receipt statuses and older event-keyed subscription emails retain the earlier audit's manual-reconciliation caveats. Printify approval/shipping and live Resend delivery remain unverified. No provider-backed financial test or production schema inspection was performed.

## Modified files

- SQL: pending third migration and new reservation migration.
- Checkout/access: `app/api/create-paywall-checkout/route.js`, `app/api/shop/checkout/route.js`, `app/api/trick-or-treat/checkout/route.js`, `lib/checkAccess.js`, `lib/prepareShopCart.js`, new `lib/checkoutReservations.js`.
- Fulfillment/lifecycle: `lib/fulfillShopPurchase.js`, `lib/itemPurchase.js`, `app/api/webhooks/stripe/route.js`, new `lib/reconcileCheckouts.js`, `app/api/internal/reconcile-checkouts/route.js`, `netlify/functions/inventory-reconciliation.js`, `netlify.toml`.
- Continuation: `lib/startItemCheckout.js`, new `lib/startShopCheckout.js`, `app/checkout/article/page.js`, new `app/checkout/shop/page.js`, `app/_components/CartDrawer.js`, `public/trick-or-treat.html`, `app/auth/confirm/route.js`, `lib/completeAuthCallback.js`.
- Tests: new reservation lifecycle/access/reconciliation/API/PostgreSQL/cross-tab suites and updated existing route/browser tests. Earlier reports are marked superseded where applicable.

## Final validation

- **142 unit/API tests passed, zero failures** using `NODE_PATH="$PWD/node_modules" node --experimental-vm-modules --test tests/*.test.cjs`.
- **Both real PostgreSQL 16 suites passed** in disposable containers: `tests/shop-payment-db.py` and `tests/inventory-reservations-db.py`. Coverage includes migration repeatability, the production-shaped digital schema, preserved historical orders/stock, eight competing reservations, six duplicate paid deliveries, product/variant/treat limits, paid holds after expiry, duplicate releases, request aliases after consumption, the entitlement/reservation race, malformed JSON/null/negative/fractional values, conflicting payments/items/allocations, rollback and all service-only grants. Containers were removed afterward.
- **Seven browser suites passed:** `checkout-resume-browser.cjs`, `checkout-intent-isolation-browser.cjs`, `tot-checkout-resume-browser.cjs`, `cart-navigation-browser.cjs`, `payment-account-browser.cjs`, `order-packing-browser.cjs`, `shop-confirmation-browser.cjs`.
- **Production build passed**, including all 149 static pages, with fake Stripe/Resend keys and Supabase pointed to local port 9. It tests compilation/prerendering, not live integrations. The generated artifacts are not a production deployment.
- **`git diff --check` passed.** Both previously applied migration files are byte-for-byte unchanged from `64e2a8a`.
