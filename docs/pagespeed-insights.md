# PageSpeed Insights in Admin Analytics

Open **Admin → Analytics → Page speed & technical SEO**. Choose the homepage, shop, article, product, issue or another supported public Parlor page, select Mobile/Desktop, then **Run audit**.

The panel shows Lighthouse Performance, SEO, Accessibility and Best Practices scores; lab LCP, CLS, FCP, Total Blocking Time and Speed Index; up to twelve relevant scored failures; and real-user LCP/INP/CLS when Google returns Chrome UX Report field data. Page-specific and website-wide field data are explicitly labeled. Missing field data is not shown as zero. Audits describe the current page and do not change when you select another historical analytics month. Technical SEO scores do not measure keyword rankings, backlinks or Google indexing.

## Enable the connection

1. In [Google Cloud Console](https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com), select/create your project and enable **PageSpeed Insights API**.
2. In **APIs & Services → Credentials**, create an API key. Restrict its permitted API to **PageSpeed Insights API**. This key is used by the server, not by browser referrers; a browser-referrer restriction would block these server requests.
3. In Netlify, add **`GOOGLE_PAGESPEED_API_KEY`** with the key value, scoped to **production Functions**, and redeploy. Do not use a `NEXT_PUBLIC_` variable.
4. Reopen Analytics and run a mobile audit on the homepage. Google Cloud quota settings govern the available request allowance. No OAuth account connection, GA4 tracking tag, new database migration or visitor cookies are required.

No real audit was requested during automated testing. Until the key is configured, the panel shows setup guidance and disables Run audit.

## Access, caching and errors

Only verified admins can access `/api/admin/pagespeed`. The browser sends its existing Supabase bearer token to our API; it never receives the Google key. Audit targets are restricted to supported public pages on the canonical Parlor domain. Tracking queries, tokens and fragments are removed before a URL is sent to Google. Admin, member, preview, authentication, API and checkout routes are excluded.

No Google audit runs on panel mount: the initial request checks configuration only. A button click requests all four categories together. Successful normalized reports are stored in Next's server data cache for one hour, keyed separately by canonical URL and device. Errors are not cached as successful reports. This is not a historical report archive; audited time is shown so a cached result is recognizable. Admin API responses are private/no-store.

The provider request has a 45-second timeout and never returns its raw error body, API credentials, large screenshots or diagnostic payloads to the browser. Quota, configuration and timeout errors have distinct messages. The endpoint declares a 60-second maximum duration; hosting-plan/runtime limits can still end a long request sooner, in which case the UI offers retry guidance. The Google PageSpeed link opens its external tool, which runs independently of this dashboard's cache.

Your existing session-based analytics, purchases, subscriber tracking, Search Console and Merchant Center integrations are unaffected. PageSpeed does not submit URLs for indexing or guarantee improved search placement.
