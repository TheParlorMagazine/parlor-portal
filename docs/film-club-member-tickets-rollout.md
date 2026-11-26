# Discounted Film Club tickets — implementation and rollout

Implemented on feature/film-club-prototype. Do not merge, deploy, run production SQL or make live Stripe transactions without separate approval. No provider tickets/licenses are purchased by this code.

## Behavior

Free/public users see standard ticket pricing and the external provider purchase link on `/film-club`. Eligible active/trialing Reader’s Circle and Printing Press members get a server-verified, configurable member price through existing Stripe customers/Checkout/reservations. Administrative roles alone do not grant the discount. The default discount is stored as 20% in the database and can be changed per screening; prices/currency are never accepted from the browser. Supported currencies are USD/EUR/GBP/CAD/AUD/JPY; calculations use integer minor units, including zero-decimal JPY.

Admin Film Club has screening configuration, Stripe product/price synchronization and archival, ticket management, net revenue totals in USD, CSV export and audit history. Ticket products are hidden/inactive in the normal catalogue by default; public lookup, image/share/feed routes filter public_listing, and generic shop/bundle checkout rejects screening products regardless of visibility. Listing a ticket explicitly must link to `/film-club`; discounted checkout always goes through its own membership-aware entry point on the existing commerce lifecycle.

Verified paid Stripe events create normal orders/items plus a private screening entitlement atomically. Checkout return is never proof of payment. The portal polls briefly after returning to allow the webhook to finish. Purchased tickets remain owned when membership later expires. Capacity includes unresolved checkout holds, paid tickets and manually reported public sales when an overall audience cap is set. Unknown public totals prevent capacity-limited sales until reviewed. Refunds retain conservative capacity commitments; administrators must review capacity before increasing limits. New complimentary RSVP calls are blocked; ordinary event RSVPs and all existing RSVP rows are preserved. There is no grandfathering backfill because the user confirms no existing complimentary reservations.

Ticket refunds extend the existing subscriber action helper using the ticket order's PaymentIntent. They never select a subscription invoice or alter membership. Signed refund/dispute webhooks and authoritative charge/dispute retrieval update ticket status idempotently, including events arriving before checkout fulfillment. Partial refunds preserve access, full refunds cancel access, and disputes block viewing until resolved in the member’s favor. Issued external provider links may not be revocable by The Parlor: administrators must handle any provider cancellation separately. Fulfillment cancellation and payment refund are distinct actions.

Administrators assign individual or shared provider viewing access manually. Viewing credentials are kept in service-only ticket rows, not event URLs, public records, CSV exports or audit payloads. Members can retrieve only their own ticket links after assignment and within the viewing window. Emails can deliver assigned instructions before the window opens, but never after expiry or screening cancellation. Shared/bulk link assignment uses a selected set of up to 100 tickets. Bulk writes report partial progress if a ticket cannot be updated; do not assume all succeeded.

Email purchase/access/refund/reminder templates are in the existing email registry. Accepted/uncertain sends keep durable claims to avoid automatic duplicate delivery. Admin send retries use the same access version; an intentional resend requires saving a new access version. Scheduled reminders use an idempotent per-ticket/access-version key and include the assigned instructions, expiry, Q&A and forum. Existing external-buyer reminders/discussion invitations remain separate. Ticket purchase is never required for registered-member discussions.

The revenue overview combines actual Stripe purchases and reported external sales in USD, using reference exchange rates and actual Stripe processing fees. Host revenue sharing, refunds/disputes, provider acquisition costs and other expenses feed the net total. Unknown costs, fees or unavailable currency conversion remain pending. Currency changes are blocked once tickets or unresolved checkouts exist, preserving historical order currency.

## Before installation

1. Run `docs/film-club-ticket-preflight.sql` read-only against the target database. Verify names are unused, existing migration prerequisites match, and confirmed complimentary RSVPs are zero. Production schema has not been independently accessed during development. If results differ, stop and reconcile before applying SQL.
2. Test `20261125180000_film_club_member_tickets.sql` in staging with the existing shop/order/checkout/Film Club migrations. It adds screening settings and private ticket/sync/audit tables; extends the existing reservation kind and RPC; and protects orders/items with service-only RLS. Review any manually created policies/grants before rollout. No already-applied migration is edited.
3. Use a staging Supabase project matched to Stripe test keys/customers and a test email recipient. Local validation uses fixtures and disposable PostgreSQL; no actual Stripe Checkout/payment or email delivery was performed.

## Activation after approval

- Apply the additive migration first, then deploy the matching code. Keep `FILM_CLUB_TICKET_SALES_ENABLED` unset/false initially.
- Retain existing Stripe webhook secret and `INVENTORY_RECONCILE_SECRET`/scheduled reconciliation. Subscribe to checkout completed/async success/async failure/expiration plus `charge.refunded`, `refund.updated`, `refund.failed`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`. Never confirm a ticket from a URL query parameter.
- Configure currency/public price/discount, future sales deadline, viewing start/end, provider details and authorization, refund policy, member/audience capacity and cost estimates. Confirm licensing/transfer/private-admission permissions outside the app; this is not inferred from a provider brand name.
- In Stripe test mode create/synchronize the product, enable sales on the published screening, and set Netlify Functions Production/appropriate staging-context `FILM_CLUB_TICKET_SALES_ENABLED=true`. Redeploy to load environment changes. Production live Stripe mutations additionally require `FILM_CLUB_LIVE_STRIPE_APPROVED=true` only after explicit approval.
- Verify free external routing; active/ineligible membership; one paid checkout; webhook retry; order history; duplicate/capacity protection; full/partial refund; authorized fulfillment; owner-only viewing and expiration; access email and intentional resend; ordinary shop/subscription checkout; forum participation.
- Never use live payments to validate development. Netlify deployment/provider integration is an additional manual verification step.

## Recovery and limitations

Disable a screening's sales or unset the global sales flag to stop new purchases; continue processing signed webhooks/reconciliation for payments already in flight. Do not delete orders, reservations or tickets to reset state. Retrying a product sync uses deterministic Stripe Product identity and a durable version operation/price metadata. If pricing changes mid-sync, save the new version and synchronize it; never issue a fallback charge. Archiving does not cancel paid tickets.

Admin ticket list/CSV currently cap at 5,000 records and display a truncation notice; audit panel shows the latest 500 events for the selected screening. The scheduled ticket reminder scan currently handles up to 1,000 access-sent paid tickets per run. Review these bounds before operating above those volumes. Actual Stripe fees are not automatically booked into profitability; configured fees are clearly estimates. External sales data are manual, not a live provider feed. Ticket registration is not the same as an event RSVP or an automated provider booking.

## Recorded local validation

- 374 automated tests passed, including existing shop, membership, auth and email regression tests.
- Disposable PostgreSQL applied the actual prerequisite migrations plus the new migration; concurrent capacity, duplicate order/ticket consumption, refunds, ownership permissions and ordinary RSVP preservation passed.
- Actual component browser fixtures passed at 390px and 1440px: ticket checkout/retry/free-provider routing, unchanged ordinary RSVP/cancellation, admin pricing/Stripe/fulfillment controls, cover/trailer uploads and forum commenting.
- Production Next.js build passed. Tests did not contact live Stripe, email providers or production Supabase. A real Stripe test-mode staging checkout and provider authorization check remain rollout steps, not claimed local validation.

## Screening subscriber list

Apply `supabase/migrations/20261126190000_film_club_screening_subscribers.sql` after the existing RSVP-contact and member-ticket migrations. This replaces only the discussion-email claim function to union paid/partially-refunded Parlor ticket purchasers with external buyer contacts and legacy confirmed RSVPs. It preserves claim IDs, the retry window, role permissions and delivery deduplication. It does not modify existing contacts, preferences, tickets or past delivery history. Tested in disposable PostgreSQL; not applied to production.

The Emails tab lists Parlor purchasers automatically plus externally added contacts. Add subscriber searches existing members or creates an auth-linked free member subscribed to the newsletter, using the existing administrator account-creation convention without sending an invitation or welcome email. Existing paid plans and opt-outs are preserved. Adding to the screening is idempotent and does not replace other contacts; partial failures report which step needs retrying. A ticket buyer added manually is treated as a confirmed external screening contact. Existing unregistered imported emails remain on the list; add the same address through New contact to register it.

The automated discussion email toggle is below the subscriber list. Delivery still requires a published screening with an end time in the past and an available, open discussion. Enabling it for a past screening makes unsent recipients eligible on the next scheduled run. No emails are sent merely by adding a contact. Verify the deployed scheduled job after rollout.

## Branch audit — 26 November 2026

Merged the three current main dashboard forum-card changes into the Film Club feature branch without conflicts; main is unchanged. Regression fixes expire open checkout sessions on the next reconciliation pass when sales are paused, pricing changes or a screening becomes unavailable; withhold viewing access and access emails after screening cancellation; use the start time for live-screening reminders and the end time for flexible-window reminders; and page reminder recipients beyond the first 1,000 historical tickets. Already completed payments remain eligible for normal reconciliation. Stripe-hosted checkout expiry depends on the deployed reconciliation schedule; assigned external provider links still require separate revocation by the provider.

Local verification includes the application test suite, the Film Club desktop/mobile browser checks, commerce/subscription/forum smoke checks, disposable PostgreSQL tests and a production build. No production SQL, emails or live Stripe payments were executed. The exchange-rate provider returned HTTP 403 from this workspace, so live currency retrieval remains a deployment verification step. Follow-up migrations must be applied in chronological order before their matching production code.
