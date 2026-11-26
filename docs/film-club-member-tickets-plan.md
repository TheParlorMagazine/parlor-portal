# Film Club discounted tickets — Phase 1 review

Status: implementation approved by user; no live provider operations or deployment authorized.
Branch: feature/film-club-prototype, brought forward to main 6c0bc01 to retain current media, auth fixes and forum crash fix. No merge to main or deployment is authorized for this project.

## Verified architecture and limitations

Repository migrations define film_club_screenings keyed by events.id, existing Events/Forums associations, administrator-only financial reports, public buyer imports, RSVP contact fields, and discussion/reminder delivery queues. Existing poster and trailer uploads can be reused. Public ticket counts are nullable and must remain “not reported” until manually provided.

shop_products has catalogue/Stripe price references and an active-product public SELECT policy. It does not currently distinguish hidden member ticket products. Orders/order_items already preserve session identity, money and historical purchased lines. Shop fulfillment assumes physical shipping/Printify and must not receive screening tickets as ordinary merchandise.

checkout_reservations, reserve_checkout, observe_checkout and reconciliation already handle concurrency, unknown Stripe creation outcomes, delayed payment and retry recovery. Both the table constraint and reserve_checkout function restrict kinds to shop_order, tot_bundle and digital. Screening support must extend those existing paths, not bypass their guards.

The Stripe webhook verifies signatures and dispatches payment fulfillment. New ticket events need their own dispatch branch integrated with these existing orders and reservations. Current subscription refund logic in lib/subscriberActions.js selects invoice payments; it cannot safely refund a ticket payment without an order-specific extension. No general ticket refund/dispute lifecycle exists in the inspected webhook.

Only repository schema was inspected. Live database state, existing provider permissions and Stripe test configuration are not independently verified. Before implementation SQL is finalized, obtain a read-only schema/constraint/function inventory and existing screening/RSVP counts from production; do not export credentials or member personal data.

## Proposed additive schema

1. Extend film_club_screenings with film details (filmmaker, runtime, language/subtitles), provider/format, viewing window, sales deadline, Q&A, sales flag, currency, stored member_discount_percent default 20, optional member-price override, member ticket cap, acquisition costs, fee estimates, fulfillment method and provider authorization evidence/date/actor. Retain existing public ticket price/reporting/licensing fields and mark their semantics clearly. Store money as integer currency minor units; configure discount once in the database/admin defaults rather than hard-code checkout calculations.
2. Link each screening to an existing shop_products row. Add product_type, Stripe product reference, visibility and synchronization metadata where absent. Ticket products default hidden; update catalogue RLS and every public product lookup and generic checkout validation so knowledge of an ID cannot bypass membership pricing. Public-shop listing is optional and must still route ticket purchases through membership-aware validation. Retain immutable Stripe price IDs on historical order items.
3. Extend checkout_reservations with screening identity/pricing-version snapshot as needed, permit a film_screening_ticket kind in constraints/RPCs, and adapt reconciliation return URLs. Reserve capacity under a screening row/advisory lock. Count pending/paid holds and grandfathered commitments consistently; reject duplicate active entitlements. Never release a hold merely because a timer elapsed when Stripe payment status is uncertain. Delayed payment must retain capacity. Price synchronization must not silently alter an existing checkout snapshot.
4. Extend existing orders with an order type/payment state where needed, preserving physical fulfillment status separately. Add a screening-ticket entitlement table because order_items alone cannot represent private access credentials, expiration and per-ticket fulfillment. Link member, screening, order/item and reservation with uniqueness guards and immutable eligibility/price/currency snapshots. Payment states and fulfillment states remain separate. A refund does not delete financial history. Tickets outlive later subscription expiration.
5. Use separate service-only ticket access records for provider viewing links/instructions and an append-only administrative audit table if no suitable existing structure is available. Add delivery claim/receipt records or extend the existing durable email mechanism with per-ticket purpose/version keys. An explicit admin resend uses a new auditable delivery version; webhook retry reuses the original key.
6. Enable RLS on new tables. Members may read only their own safe ticket fields; access credentials are returned only by authenticated owner/admin API after fulfillment and within viewing windows, with no-store responses. Financial settings and internal notes stay admin-only. No credential is stored in Stripe metadata, public event fields, CSV exports or logs.

## Existing reservations and rollout

Do not rewrite or delete event_rsvps, including contact fields or queue records. User confirms no complimentary reservations exist. Do not run a conversion/backfill. Preserve RSVP records and verify the count before rollout. Treat existing waitlist entries as legacy waitlist, not confirmed access. Preserve cancellation/fulfillment history. Existing already-assigned external buyers remain distinct from paid Stripe purchases.

Existing screenings remain sales-disabled until configured and explicitly enabled by an administrator. No complimentary registrations exist per user confirmation. New screening drafts use the discounted model with ticket sales disabled. When switching a screening, show the protected legacy commitments, provider authorization and capacity impact first. Publication alone must not enable sales. Old RSVP entrypoints reject new complimentary registrations after cutover while preserving confirmed reservations and non-Film Club RSVP behavior. Adjust old reminders to avoid duplicate or misleading complimentary-ticket messages.

Install additive schema before deploying consumers, backfill and verify counts, test with sales disabled, then explicitly activate selected screenings. Rollback disables new sales without removing tickets/orders or losing webhook reconciliation; continue processing paid/processing checkouts. No destructive rollback of financial records.

## Integration and affected files

- app/admin/_components/FilmClubAdmin.js, FilmClubAdmin.module.css, FilmClubMediaFields.js: existing screening cards/tabs/styles; configuration, pricing preview, Stripe product actions, ticket search/export, fulfillment, estimates.
- app/api/admin/film-club/route.js and scoped subroutes: strict validation/admin authorization, audited settings, idempotent Stripe synchronization, ticket management and fulfillment.
- app/portal/film-club/PublishedFilmClub.js, filmClub.module.css, app/portal/events/[id]/page.js and event RSVP route: replace new complimentary RSVP CTA; display server-calculated price/discount, grandfathered status and owned tickets; retain trailer/cover/design.
- app/api/portal/film-club/screenings/route.js and authenticated checkout/ticket endpoints: explicit safe fields, ownership, published/sales/deadline/member eligibility checks. Public visitors need a safe public screening projection; no authenticated-only API is exposed wholesale.
- lib/checkoutReservations.js and inventory reservation migration/RPCs: extend existing checkout lifecycle and capacity allocation.
- lib/stripeCustomer.js, app/api/webhooks/stripe/route.js, checkout reconciliation: reuse existing customer linking and verified payments; transactional order+ticket confirmation, refunds/disputes and retry handling.
- lib/fulfillShopPurchase.js/shared order helpers: extract/reuse safe order persistence; keep ticket orders out of shipping/Printify. app/api/portal/orders/route.js, app/portal/orders/page.js, admin order UI/API: ticket-specific fulfillment and order references without shipping controls.
- lib/filmClubEmails.js, lib/emails.js, lib/stripeEmail.js, existing worker/queues and email admin catalogue: purchase confirmation/access/reminder/refund templates and delivery status. No access email before provider-authorized assignment.
- Public shop product APIs/detail routes/catalogue policies: hidden ticket protection and explicit listing rules.
- New migration(s), shared integer-pricing/profitability helpers, focused API/browser/SQL tests and rollout documentation. Do not edit already-applied migrations.

## Pricing, products and checkout

Server uses the stored currency exponent and integer amounts, validated discount and optional override. Default 20% is configurable; shared pure helper calculates admin preview and checkout quote identically. Validate currency support, Stripe minimum charges, zero-price cases and overrides; do not silently turn a paid ticket into a free checkout. Costs/revenue never aggregate across currencies.

Create Stripe Product/Price in test mode only, using durable operation IDs/idempotency keys and local synchronization states to recover provider success followed by database failure. Lock/version concurrent synchronizations. New immutable Prices replace the active reference without changing past orders; archive old prices only once new reference is durable, and do not invalidate open paid checkout snapshots. Verify Stripe price amount/currency/product identity and configured version before Checkout creation. Archiving disables new sales without destroying purchase history.

At checkout verify the authenticated confirmed member and current eligible Reader’s Circle entitlement server-side. The old code broadly treats Reader’s Circle and Printing Press as paid: proposed default retains Printing Press eligibility as the higher tier, subject to user confirmation. Do not infer eligibility solely from a client badge or stale Stripe metadata. Keep existing customer id and eligibility-at-purchase snapshot. The client submits screening/request IDs only. Confirm purchase exclusively from verified paid Stripe state, never the success URL. Payment-confirmed page says access fulfillment is pending and shows no viewing URL until fulfilled.

Capacity and duplicate constraints cover concurrent tabs, webhook retries and late async payments. Reuse verified authoritative provider state before release. Refunded/disputed tickets retain audit/history; access is suspended/cancelled according to explicit policy, with dispute resolution transitions handled idempotently and out-of-order events reconciled against Stripe.

## Fulfillment and profitability

No automated external purchasing or assumed permission to resell/transfer provider tickets. Require recorded administrator confirmation of the selected provider arrangement before enabling member sales or sending access. Bulk fulfillment is conditional on authorized licensing and keeps each member’s delivery/access state separate. Existing free/paid registered discussion access and archived threads remain independent of ticket ownership.

Store host-share eligibility as unknown/yes/no, default unknown. Show acquisition estimates both with and without a host share when unconfirmed. Model collected member revenue, actual/estimated Stripe fees, acquisition cost, eligible host share, separately reported public share, licensing costs, refunds and other expenses. Unknown external counts/costs stay unknown; avoid presenting them as measured zero. Show individual versus license scenarios; retain configurable 23-ticket operational-review threshold as advisory only. Identify estimates and currency on every total.

## Validation and approval gate

Use Stripe test keys or local fixtures only; no live transactions. Test server eligibility, hidden products, pricing rounding/exponents/overrides, concurrent sync/capacity/duplicate requests, webhook signatures/retries/async outcomes, order ownership/history, refund/dispute ordering, provider authorization, private access/expiration, email idempotency/resend, economics and unchanged forum/shop/subscription flows. Apply migrations to disposable PostgreSQL with existing migration fixtures and test service/member/anonymous roles. Netlify test deployment and manual verification require separate approval.

User approved implementation on feature/film-club-prototype. No approval to merge or deploy. Open confirmations: Printing Press eligibility; acceptable cancellation/refund policy; which provider arrangement is authorized. These do not authorize live external purchases.
