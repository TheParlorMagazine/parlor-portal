# Film Club branch audit — 26 November 2026

Scope: feature/film-club-prototype compared with freshly fetched origin/main, including ticket checkout, webhooks/recovery, orders/inventory, access/fulfillment, refunds/disputes, subscriber creation, discussion email queues, reporting, public/member/admin UI, migrations and Netlify jobs. This is a source and local execution audit, not a production infrastructure audit.

## Main compatibility

Main contained three additional dashboard forum-card commits (1144fbe, 9495acf, f197fb4). They merged cleanly into the feature branch, preserving main's thumbnail, layout and hover/focus behavior. Main was not modified. No unresolved merge conflicts remain. Shared shop/subscription routes and the existing reservation RPC extension were checked against main and exercised by regression tests.

## Confirmed issues fixed

1. Open hosted checkout sessions remained usable after pausing sales or changing prices. Reconciliation now checks the screening sales flag, archive flag, synchronized version and reserved Stripe price, alongside publication/public visibility/start time. Invalid open sessions are expired on their next reconciliation pass. Completed payments still follow normal fulfillment and are not discarded.
2. Cancelling a screening did not prevent an assigned viewing URL from being returned to its owner or emailed. Access checks now include the event's cancellation status. The member API retains the paid receipt, shows cancelled fulfillment and omits credentials; access/reminder email delivery is rejected. This does not revoke provider links that have already been shared outside the app or automatically refund payments.
3. Live-screening reminders used the viewing end time rather than the start. Live reminders now target the start; flexible-window reminders target the viewing expiration. Cancelled and already-started live screenings are excluded.
4. The reminder job scanned only the first 1,000 tickets. It now pages a stable purchase snapshot, so historical receipts cannot permanently hide later purchasers. A 1,001-ticket regression test verifies the boundary.

The rollout document also contained retired profitability/private-license and authorization-checkbox descriptions. Those descriptions now match the current net-revenue and fulfillment workflow.

## Verification

- Full application unit/API regression suite, including new cancellation, stale-checkout and reminder boundary cases.
- Five Film Club browser suites on mobile/desktop: media/subscriber/forum admin flows, pricing/publish/ticket management, calendar/time-zone/DST behavior, revenue and USD conversion, public/paid purchase routing and ordinary event RSVPs.
- Additional browser smoke checks: ordinary shop confirmation, subscriber billing actions, Democracy Salons/Film Club forum rendering, auth email recovery.
- Four disposable PostgreSQL suites: Film Club tickets/capacity/RLS/paid-order idempotency, discussion/reminder queues and deduplication, shared inventory reservations, ordinary shop payment fulfillment.
- Production Next.js build using command-scoped placeholder credentials; whitespace/diff checks.

## Deployment limits and remaining verification

No production database, live Stripe transaction, provider access link, email delivery or Netlify deployment was changed. Verify the target migration history, including the publishing and screening-subscriber follow-ups, before deploying matching code. No additional migration was introduced by this audit.

Stripe-hosted checkout expiry/automatic archival depends on the deployed scheduled functions and credentials. There can be a delay until the next reconciliation pass; the application cannot revoke a provider link already copied or emailed. Production webhook subscriptions and scheduled invocation still require deployment verification.

The live exchange-rate URL returned HTTP 403 from this workspace. Validated fixture conversions and unavailable-rate handling pass, but live provider connectivity must be checked from Netlify. Revenue uses dated reference rates for the report, not a historical accounting settlement rate.
