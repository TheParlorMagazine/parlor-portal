# Campaign and newsletter subscriber activity

Status: implementation only. No production SQL, emails or deployment performed.

## What the dashboard shows

Emails → Campaigns now lists campaigns and newsletter sends. Open Tracking for
accepted/delivered counts, unique and total opens/clicks, most-clicked destinations,
and a paginated subscriber activity table with names, email addresses, click URLs,
click times, opt-out state, and campaign-attributed unsubscribe dates. Filter by
opened, clicked or unsubscribed. Unsubscribe history shows email-link and account
preference opt-outs; pre-existing dated opt-outs are labeled historical and are
not assigned to a campaign. Deleted accounts no longer expose their identity.

An accepted provider message ID is saved against each campaign/member. Signed,
replay-safe Resend webhook events can arrive before that mapping without being
lost. Missing tracking is shown as unavailable/not tracked, not a zero rate.
No IP addresses, user agents, URL query parameters, or URL fragments are stored.
Queries are staff-only (admin/editor/social_admin), paginated and private/no-store.

## Unsubscribe behavior

New sends have signed member+campaign links and RFC 8058 unsubscribe headers.
GET renders confirmation instead of changing preferences, protecting against
link scanners; POST saves the preference and event atomically before claiming
success. Old signed member-only links still work, without campaign attribution.
The preferences trigger captures account/admin changes in the same transaction.
Opt-out prevents future campaign/newsletter sends; it does not cancel a paid plan.
Resubscribing clears the old unsubscribed_at suppression timestamp.

## Review and activation order

1. Back up and review `supabase/migrations/20261026140000_campaign_engagement_tracking.sql`.
   Rehearse in staging. This additive migration requires existing members
   (`id`, `full_name`, `email`, `newsletter_subscribed`, `unsubscribed_at`) and
   email_campaigns tables. It creates event/delivery tables, staff-only RPCs,
   a members preference-change trigger, and backfills dated historical opt-outs.
   It does not delete or overwrite member, purchase, order, or subscription data.
   It can be reapplied; the earlier unmerged draft migration is not needed.
2. Apply that reviewed migration before deploying this code. Without the new
   schema, new campaign sends fail closed before contacting Resend; unsubscribe
   POST also reports a retryable failure instead of falsely reporting success.
3. In Resend, enable open and click tracking for the verified sending domain.
   Create a webhook for https://www.theparlormagazine.com/api/webhooks/resend,
   selecting email.delivered, email.opened, email.clicked, email.bounced,
   email.failed and email.complained. Copy its signing secret into the server-only
   Netlify variable RESEND_WEBHOOK_SECRET (production Functions scope).
   Keep NEWSLETTER_SECRET stable so existing unsubscribe links remain valid.
4. Separately authorize merge/deployment, then deploy with those settings.
5. Send a new small, consented test campaign to your own test subscriber accounts.
   Test a click, confirmation-page unsubscribe, RFC one-click POST, and account
   resubscribe. Verify correct subscriber/campaign attribution and suppression
   before sending to the full audience. Test emails sent through Send Test are
   deliberately not counted as subscriber campaign deliveries.

## Validation

165 automated tests, the disposable PostgreSQL tracking suite, the subscriber
activity browser test, the existing campaign/newsletter sending browser test,
and the production build passed using mocked/local providers. No live emails,
Resend settings changes, production SQL or production deployment were performed.

## Limits

Old sends cannot be reconstructed from aggregate counters. Resend-domain tracking
and webhook settings have not been verified live. Privacy proxies inflate opens;
link scanners can inflate clicks, so events are observations, not proof a person
read an email. Forwarded email activity remains attributed to its original
recipient. URL query strings are removed, so query-only destinations are grouped.

Missing accepted-response mappings after an uncertain send require manual review;
never resend a campaign solely to repair tracking. Existing preferences without
an unsubscribe date have current state but no fabricated historical timestamp.
Manual opt-outs performed only inside Resend are not imported by this webhook.
Historical unsubscribe counts record transitions, and a subscriber may later
resubscribe. Campaign-attributed opt-outs require the signed link from a new send.

The old `/api/emails/unsubscribe?id=...` route remains for compatibility; it has
legacy unsigned-link behavior and cannot attribute events to a campaign. The new
newsletter link is signed and GET-safe. Deleting a campaign also removes its
provider delivery mappings and aggregates; export/review before deleting sends.
