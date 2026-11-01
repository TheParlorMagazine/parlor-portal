# Subscriber profile: last 30 days

Implementation is on `fix/campaign-email-styling`. No production migration,
provider call, email send, merge or deployment was performed for this feature.

## Dashboard

Admin → Subscribers → select a member → Overview → below Notes:
- page visits, site clicks, email opens/clicks, shop orders, article purchases,
  and account/preference change counts;
- ten most-visited paths and most-clicked links/actions;
- paginated recent activity with timestamps, email destinations, order amounts
  and current status, and changed profile/subscription field names.

Empty recorded activity and unavailable data are distinct states. Staff roles
admin/editor/finance_admin/social_admin can read the API; ordinary subscribers
and writers cannot. All API responses containing activity are private/no-store.

## Collection and privacy

Site events are authenticated with verified bearer tokens or Supabase cookies.
Member identity is derived server-side; clients cannot submit events for another
member. Server timestamps, UUID deduplication and an atomic 120-events-per-minute
limit apply. Next.js pages and the standalone Trick-or-Treat page are instrumented.
Other legacy standalone HTML pages are not instrumented by this change.

Visited paths omit queries/fragments and normalize UUID path identifiers.
Authentication, checkout, admin and private-message pages are excluded. External
click targets omit credentials, queries and fragments. No form input, message
text, IP, user-agent, session token, purchase address or card data is recorded.
Buttons are collected only as a small fixed set of commerce/account actions.
Browser DNT/GPC signals disable visit/click collection; operational account audit
and financial/email records are independent of those browser signals. No anonymous
visitor identities are joined to subscribers retroactively.

Profile/subscription updates are audited in a DB trigger in the same transaction
as the update. Only changed field names are saved; previous/current field values
and internal notes are excluded. Existing preference, paid-order and article
purchase records are read without modifying their schema or behavior.

Email events and settings attribution require the earlier campaign tracking code,
migration and Resend webhook settings. Opens/clicks can reflect proxies/scanners;
forwarded email events remain attributed to the original subscriber. Client-side
site telemetry is best-effort, can be blocked, and is not a financial audit trail.
Purchases in the activity feed come from existing saved order/purchase records,
not from client click claims. Order status shown is current, not a fabricated
historical status-change event. Subscription history starts when its trigger is
installed; old plan changes and old anonymous page visits cannot be reconstructed.

## Migration and deployment sequence

1. The campaign tracking migration `20261026140000_campaign_engagement_tracking.sql`
   must already exist. The user reported applying it; do not edit it for this work.
2. Review/backup/rehearse and apply the NEW additive migration
   `supabase/migrations/20261026160000_subscriber_activity.sql`. It creates two
   service-only event tables, a field-only members audit trigger, a service-only
   combined feed, rate-limited insert/summary/cleanup functions and indexes.
   It does not delete or alter purchase, order or subscription data.
3. Deploy this branch only after separate authorization. Confirm Resend webhook
   settings and the latest unsubscribe-key compatibility fix are included.
4. Netlify's `subscriber-activity-retention` scheduled function runs daily and calls
   the authenticated internal cleanup endpoint. It uses ACTIVITY_RETENTION_SECRET
   if set, otherwise the existing INVENTORY_RECONCILE_SECRET or CRON_SECRET.
   Origin is INVENTORY_RECONCILE_ORIGIN or Netlify URL; use the canonical HTTPS
   origin without redirects. Scheduled jobs run on the published production
   deployment, not previews. Confirm the job is enabled and succeeds.
5. Verify with an authenticated test member: visit pages, click a link, change a
   profile field and newsletter preference, and inspect that member's profile.
   Use existing test purchases or a separately authorized test payment for the
   purchase section. Check DNT/GPC and staff authorization before a broad rollout.

Site/account-change events older than 30 days are removed by the daily cleanup;
all sources are filtered to the last 30 days in the view even before cleanup.
A disabled or failing scheduled function delays physical deletion: monitor it.
Email consent and financial history are preserved under their existing retention.

## Validation

Automated API/helper tests cover authorization, identity spoofing, sensitive-path
and URL stripping, invalid events, errors, pagination and the cleanup secret.
A disposable PostgreSQL suite covers repeatable migrations, 30-day boundaries,
member isolation, email/purchase/preference rollups, field-only audit/rollback,
concurrent deduplication and rate limiting, private grants, cleanup, and both
legacy purchase timestamp column names. Actual browser tests exercise the
subscriber drawer beneath Notes and authenticated collection including Strict
Mode, DNT/GPC, private-page exclusion, URL sanitization and visible failure states.
Production build uses placeholder credentials/local endpoints; live provider and
production-schema behavior is not verified by that build.

Result: 172 automated tests, the disposable PostgreSQL suite, the subscriber
profile/collector browser suites, the existing campaign activity and Trick-or-Treat
resume browser checks, and the production build passed.
