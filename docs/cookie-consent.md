# Cookie choices and GA4 collection

The approved white serif cookie banner is shared by Next.js pages and the standalone Trick or Treat page. Accept analytics and Reject optional have equal styling; preferences explain essential storage and an optional analytics switch. The footer and a persistent Cookie preferences button reopen it. No optional analytics are enabled until an affirmative choice; malformed, future-dated or older-than-180-day choices are ignored. A versioned localStorage record contains only the choice and timestamp. DNT/GPC override opt-in. Essential authentication, cart and wishlist storage are not gated by this banner.

The existing page-view, live-presence and signed-in activity trackers are gated together. Rejection reduces the audience measured by the admin dashboard. A withdrawal clears known analytics identifiers and GA cookies and reloads to unload Google's runtime; completed analytics events are not retroactively deleted. The standalone promotional page has the shared choices and gated first-party telemetry. This does not control unrelated third-party content embedded by authors; embedded services require their own review.

## GA4 setup

The reporting API and GA4 collection are separate. In Google Analytics select the intended property, then Admin → Data streams → the Web stream. Confirm the stream URL is the Parlor site. Copy its non-secret G-… Measurement ID into Netlify as NEXT_PUBLIC_GA_MEASUREMENT_ID for Production, with Builds scope. Redeploy. The numeric GOOGLE_ANALYTICS_PROPERTY_ID and private service-account JSON still configure only the report reader and must identify the same property. Never put the private JSON in NEXT_PUBLIC variables.

Next.js pages load the Google tag only after analytics opt-in and only with a valid configured Measurement ID. Advertising storage, advertising user data and personalization remain denied. Admin, authentication, checkout and portal paths are excluded from GA4 page-view initialization. Explicit page locations omit query strings and fragments. The standalone static promotional page does not initialize the GA4 tag in this change. Google settings such as enhanced measurement should be reviewed separately; the runtime may collect additional events according to that stream's configuration once consent is granted.

Test using a browser without an analytics blocker: accept analytics on the public site, visit multiple pages, inspect GA4 Realtime and use Tag Assistant to confirm the destination G-… ID. Without opt-in, GA requests must be absent. Reopen preferences, reject optional analytics and confirm tracking stops after reload. Standard GA reports can lag 24–48 hours. This does not backfill historical first-party visits into GA4, and its consent-filtered numbers need not match earlier dashboard totals.

## Verification

The consent browser test exercises the real notice and React analytics wrapper at desktop/mobile widths with mock network providers. It covers absence of telemetry before consent, rejection across reloads, opt-in, withdrawal and cookie cleanup, malformed/expired choices, GPC, and admin-page exclusion. Live GA4 ingestion requires the real Measurement ID and production deployment and is not established by local mock-provider tests.
