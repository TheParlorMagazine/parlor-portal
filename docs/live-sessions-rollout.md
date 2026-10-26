# Private live-session drawer

On `fix/campaign-email-styling`; no production SQL, email sends or production
deployment were performed for this feature.

## Admin behavior

Click the Dashboard's Active Sessions tile or Visitors Online Now card to open a
right-side drawer. It lists every admitted active session, with member name/email
when server-verified or Unidentified user for guests, a session suffix to distinguish
tabs, current page, device, approximate location and last-seen time. Select any
session to inspect its details and up to 20 recent paths. The list remains
available while inspecting a session. Escape, close or backdrop closes the drawer.

The API considers a session active if seen within 90 seconds. Open drawers refresh
every five seconds, closed dashboards every 15 seconds. Visible browser tabs send
heartbeats every 20 seconds and immediately on navigation/auth changes. Counts
now come from the same live API as the list, rather than counting page views as
sessions. Network failure is visible and never represented as zero live visitors.

## Identity, location and privacy

The existing browser-writable active_sessions table is not altered and never
receives member identities. A new service-only live_site_sessions table contains
the private feed. Anonymous page-view analytics remain intact; their old presence
writes and direct admin presence subscriptions are retired.

Supabase authentication is verified server-side for each heartbeat. Browser
member IDs, names, emails and location claims are ignored. Clients receive a
signed, expiring token; per-document random instance IDs derive an unguessable
session ID, keeping retries idempotent and separate tabs distinct. Tokens and
instance nonces are not stored in the table. ACTIVE_SESSION_SECRET is optional;
otherwise the existing NEWSLETTER_SECRET or service-role key signs presence
using a distinct HMAC domain. No new newsletter-key change is necessary.

On Netlify, x-nf-geo provides approximate country/region/city from the visitor's
IP, with a country-header fallback. No raw IP, coordinates, URL query parameters,
fragments, auth codes, checkout references, private messages or form values are
stored. Names/emails are joined from members only in staff API responses. Locations
can be absent on localhost or where the host doesn't supply headers; VPNs/proxies
can make them inaccurate. There is no GPS or third-party IP lookup in this feature.

Authentication, checkout and private-message routes are shown as generic page
labels. Admin pages are excluded. DNT/GPC disable presence. Anonymous browsing
history is cleared when a session changes to a member or back to guest, avoiding
linking histories across shared-account transitions. A fresh document has its own
nonce; reloads or lost exit requests can leave a stale row for up to 90 seconds.
Presence is a recent-activity estimate, not proof someone is actively reading.

The new table has RLS with all anon/authenticated/PUBLIC access revoked. Only the
service role can read/write or execute its RPCs; the admin endpoint separately
gates admin/editor/finance_admin/social_admin roles and disables caching. It reads
all pages up to the atomic 5,000-active-session admission cap. Excess telemetry is
rejected without blocking browsing, authentication or purchases. Bots and blocked
or offline clients affect counts; this is not a billing/audit source.

## Migration and deployment

1. Review and rehearse `supabase/migrations/20261026180000_live_sessions.sql`.
   It creates a private table, index and service-only heartbeat/cleanup RPCs.
   It doesn't modify members, orders, purchases, earlier migrations, the legacy
   active_sessions table or its policies. Reapplying is supported and tested.
2. Apply the reviewed migration before deploying. The earlier 14:00 campaign and
   16:00 subscriber-activity migrations remain unchanged and are still required
   by the branch's other features and the shared scheduled cleanup.
3. Deploy the whole branch only after separate authorization. Verify Netlify
   exposes its geolocation headers and NETLIFY=true to Functions. Local previews
   normally show Location unavailable; never add production credentials to a
   browser to fabricate location data.
4. Check the existing subscriber-activity-retention scheduled function. Its
   authenticated internal endpoint now prunes both 30-day subscriber logs and
   live rows older than ten minutes. The heartbeat RPC also removes expired
   records in bounded batches. Old rows are never displayed even if cleanup is
   delayed. A disabled/failed scheduler can delay physical deletion during idle
   periods; monitor its logs. A separate ACTIVE_SESSION_SECRET is optional, not
   required when the existing fallback key is configured.
5. Use two browsers/tabs with guest/member states. Confirm names, approximate
   location, page changes, sign-out identity clearing and tab expiration in the
   drawer. Confirm ordinary members cannot read the admin session API.

## Validation

176 automated tests, the disposable PostgreSQL live-session suite, the actual
right-drawer browser test and the real presence-script browser test passed. Tests
cover forged/expired signatures, instance idempotency, anonymous impersonation,
location spoofing, staff authorization, 1,001-session pagination, API failure,
identity transitions, concurrent heartbeats and admission caps, page-history
bounds, stale filtering/cleanup, legacy table preservation, private grants,
multiple tabs, route changes, DNT/GPC and drawer interaction. Production build
passed with placeholder keys/local endpoints; live production headers/provider
configuration have not been verified or changed.
