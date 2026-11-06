# Analytics reports and connections

Implemented in Admin Analytics; deployment and credentials are separate steps.

Admin → Analytics has one compact Report selector: Website overview, Page health, Search & SEO, GA4 acquisition, Product visibility, and Paid marketing. Paid marketing contains Google Ads, Instagram / Meta, Reddit Ads and Pinterest Ads. Existing first-party session analytics stays intact. No new tracking tags are installed.

Reports load only when an administrator requests them. Configuration status is not a verified connection; successful loading verifies access. Dates belong to each requested report, not to the overview's month picker. Retrieved reports remain in browser component state while switching views, and disappear on refresh. The paid-platform selection also survives switching views. They are not a historical archive. There is no scheduled synchronization or report cache for the connected providers yet.

Current report CSV exports the selected source's last loaded report, including actual dates, retrieval timestamp, attribution/coverage notes and currency where returned. Available reports ZIP contains separate CSV files for all sources loaded in this browser session, the current loaded overview and the latest PageSpeed audit. Empty reports explicitly say no rows returned. Unconfigured providers never contribute fake zeros. Annual PDF remains the existing website overview report. CSVs escape spreadsheet formulas. ZIPs are generated locally.

## Google setup

Create a Google Cloud service account and enable these APIs in its project. Add its email as a user with the minimum reporting access in each account/property. Store the service account JSON as the server-only `GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON` environment variable; never use a `NEXT_PUBLIC_` variable or commit the private key. Restrict access to the deployment environment and rotate keys when needed.

| API | Server configuration | Current report |
| --- | --- | --- |
| Google Search Console API (`searchconsole.googleapis.com`) | `GOOGLE_SEARCH_CONSOLE_SITE=sc-domain:theparlormagazine.com`; grant service account property access | Top 1,000 pages: clicks, impressions, CTR fraction, average position. Not query, indexing or sitemap diagnostics. |
| Google Analytics Data API (`analyticsdata.googleapis.com`) | `GOOGLE_ANALYTICS_PROPERTY_ID` numeric property ID, grant service account Viewer role | Top 1,000 source/medium rows: sessions, active users, engaged sessions and key events. Users are not additive across rows. |
| Merchant API (`merchantapi.googleapis.com`) | `GOOGLE_MERCHANT_ACCOUNT_ID`; grant Merchant account reporting access | Daily organic product clicks, impressions, CTR. Requires reporting eligibility; product approval diagnostics not included. |
| Google Ads API (`googleads.googleapis.com`) | `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_DEVELOPER_TOKEN`, supported `GOOGLE_ADS_API_VERSION` such as `vNN`; optional manager `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Up to 1,000 campaigns: impressions, clicks, spend in account currency, conversions and conversion value. Service account must have Google Ads account access and the developer token must be approved for that account. |
| PageSpeed Insights API (`pagespeedonline.googleapis.com`) | `GOOGLE_PAGESPEED_API_KEY` | On-demand audits; see `pagespeed-insights.md`. |

Google authorization uses short-lived signed service-account JWT exchanges on the server, with per-provider scopes (`webmasters.readonly`, `analytics.readonly`, `content`, `adwords`). Reporting only performs read operations. This implementation uses server-managed credentials rather than an interactive Google sign-in/refresh-token flow. API versions must be selected from the provider's currently supported versions at deployment.

GA4 means Google Analytics 4. Enabling its reporting API does not install tracking or purchase events. GA4 must already receive the desired events, with the site's consent settings respected. The numeric property ID is different from its `G-...` measurement ID. Google reporting may lag or apply thresholds.

## Paid marketing setup

| Platform | Server configuration | Current coverage |
| --- | --- | --- |
| Instagram / Meta Marketing API | `META_ACCESS_TOKEN` with `ads_read` and account access; numeric `META_AD_ACCOUNT_ID` without `act_`; supported `META_GRAPH_API_VERSION` such as `vNN.0` | Campaign rows from Instagram placements only: impressions, all clicks, spend and account currency. Facebook placements excluded. Up to the first 1,000 provider rows; pagination is flagged. No conversion metrics yet. |
| Pinterest API v5 | `PINTEREST_ACCESS_TOKEN` with `ads:read` and approved app/account access; numeric `PINTEREST_AD_ACCOUNT_ID` | Up to 250 campaigns with spend, impressions and clickthroughs, with account currency. Further campaigns are flagged; conversion reporting is not implemented. Provider date-history limits apply. |
| Reddit Ads API v3 | `REDDIT_ACCESS_TOKEN` with Ads reporting access, `REDDIT_AD_ACCOUNT_ID`; optional descriptive `REDDIT_USER_AGENT` | Daily campaign IDs, impressions, clicks and spend in account currency. Up to 31 days, split into three-day UTC requests. Current day ends at the last complete hour. Pagination is flagged; conversion reporting is not included. |

These are server-managed access tokens; automated token refresh and interactive account connection flows are not implemented. Use the provider's supported token lifecycle and rotate expired credentials. Account tokens and private keys never appear in browser responses, exports, logs or URLs. Provider errors are sanitized. Admin authentication and role checks guard both configuration status and reporting requests. Each provider request has a 12-second timeout (Google token exchange: 15 seconds), so sequential account/campaign/report lookups stay within the route’s 60-second hosting budget. Endpoints and account IDs are fixed by server configuration; browsers cannot supply provider URLs or tokens.

No cross-platform conversion or ROAS total is shown because attribution windows overlap, click definitions vary and accounts may use different currencies. The provider-specific notes and dates travel with exported data. Large reports are explicitly limited rather than presented as complete totals.

## Validation limits

Unit tests mock the providers and verify scoped authentication, permissions, date validation, source isolation, currency preservation, CSV safety and safe failures. Browser tests cover platform selection and source-specific exports. Live credentials are not available in this workspace; external API documentation requests are blocked by the network proxy. Pinterest contracts were checked against the official `pinterest/api-description` OpenAPI specification. Reddit report requests and micro-unit handling were checked against Airbyte’s published source-reddit-ads connector (commit `10ee3b46fa8c90280d788f37bbace26b262ec805`); this is a third-party implementation reference, not live provider verification. Live account acceptance, API versions and permissions must be validated during setup. Nothing here establishes a live reporting connection by itself.

## Merchant API access errors

The Product visibility report uses Merchant API, not the legacy Content API. Enable `merchantapi.googleapis.com` in the Cloud project that owns the reporting service account. The numeric Merchant Center account ID must match the account to which that service account has been added with reporting access. An existing Verified user entry does not establish that the API is enabled or that any required Merchant API developer registration has been completed for the Cloud project.

Merchant authorization failures now classify Google's structured `SERVICE_DISABLED`, `ACCESS_TOKEN_SCOPE_INSUFFICIENT` and `DEVELOPER_REGISTRATION_REQUIRED` reasons into actionable messages. Developer-registration message patterns are also recognized, without returning the raw Google error, private metadata or credentials to the browser. Unknown denials remain a checklist rather than a guessed cause. A successful mock-provider test does not establish live access. After deployment retry the report to get the narrowed diagnosis; do not rotate a working service-account key or broaden Merchant permissions solely because of a generic denial.

### One-time project registration

When Product visibility receives Google's developer-registration requirement, it offers a registration form. Enter a human Google Account email for developer notifications and explicitly click Register project with Merchant Center. This sends an authenticated admin-only POST to `/api/admin/reporting/merchant-registration`; the server uses the already-configured service-account JWT and Merchant account ID, so it registers the reporting Cloud project rather than a generic API Explorer project. Browser-supplied account IDs, project IDs, endpoints and tokens are not accepted. Loading reports never runs registration automatically.

The operation calls Google's `POST /accounts/v1/accounts/{account}/developerRegistration:registerGcp` with `developerEmail`. Google creates the project's developer registration and adds or updates the email contact for API notifications/API developer access. Use an email associated with a human Google Account, not a service account. A confirmed success means Google accepted registration; click Load report afterward to verify reporting access. If the response is lost, retry the report before repeating registration. No production registration was performed during implementation; local tests mock Google's endpoint.

Reference: Google's official API definition at https://github.com/googleapis/googleapis/blob/master/google/shopping/merchant/accounts/v1/developerregistration.proto .
