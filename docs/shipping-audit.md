# Cart shipping audit

Packaging adds one nullable product column through 20261114170000_shop_packaging_size.sql. The user confirmed applying this migration before the initial merge to main.

Verified: prepareShopCart expands fixed bundles and selected-product bundles into their stored components, including component quantity and bundle quantity. quoteCartShipping adds their weights and submits ounces to Shippo. A regression test checks two 11-ounce bundles plus one 3-ounce item produces a 25-ounce request.

Fixed:
- Cart treated an API error object as free shipping. It now validates HTTP status and a finite nonnegative amount, clears stale quotes, and displays quote errors.
- Cart only refreshed quotes for country/state changes. It now refreshes for delivery-address edits too.
- Missing/invalid manual weights silently became 8 oz. These now require a valid stored weight; selected variant weights override product weight when present.
- Missing Shippo configuration, rejected requests, and empty/invalid rates silently became a flat 5-unit charge. These now return actionable errors and prevent checkout creation. Shippo requests time out after 10 seconds.
- Prepared lines now retain their own resolved product during quoting instead of having same-product variants overwritten in a product-ID map.
- Shipping endpoint consistently uses the address country/state, matching checkout.

Remaining limitations/configuration to check before release:
- Live product weights and Shippo environment values were unavailable in this workspace. The exact production failure is unconfirmed. Cart now exposes the server error; Shippo HTTP failures log status only, without credentials or addresses.
- Manual products now select Small (15 × 10 × 10 cm), Medium (30 × 22 × 15 cm), Large (45 × 35 × 25 cm), or Media (12 × 9 × 0.5 in). Metric box sizes are authoritative because the supplied inch equivalents differed. Existing products remain unassigned until reviewed; they never silently become magazine mailers.
- Combined manual shipments use conservative rectangular packing of the selected single-item packages, rotate them to fit, promote to larger boxes and split into multiple large parcels when necessary. Every parcel carries only its assigned manual-item weight. Media mailers are used only for one item. This is a packing estimate, not a guarantee of physical fit: use the quoted package dimensions when fulfilling and include packing materials in stored shipping weights. A metric Medium box is slightly smaller than the specified Media mailer in length and width, so multiple media items may promote to Large.
- Shippo USD amounts are reused numerically for EUR/GBP under the existing shop currency policy; this is not an exchange-rate conversion.
- Existing manual free-shipping threshold remains 100 in the billing currency.
- Provider isolation is tested for manual-only, Printify-only, mixed bundles, and the manual free-shipping threshold. Printify receives only provider product IDs/variants/quantities and needs no manual package/weight. Shippo receives only manual parcels. Their rates are added for mixed carts; the manual free threshold never waives Printify fees. Printify failures or missing configuration now stop checkout instead of falling back to a flat charge or entering Shippo.
- Existing Issues-category preference for Media Mail needs business review against carrier eligibility for actual publication contents.

No live Shippo requests, purchases, labels or production records were created during tests.

## Pre-merge review

Reviewed against main 86a1d29. No Git merge conflicts. All 317 unit/API tests, production build, and browser checks for announcement media, sidebar slots, original banners, stale refreshes, shop popup controls, cookie spacing/consent, packaging, cart navigation/purchase cleanup passed. Added a cart quote browser check covering delayed catalogue load, API errors, paid/zero quotes and debounced address refreshes. Fixed first-open quotes not refreshing after catalogue load and cancelled superseded requests.

The initial release gate was resolved when the user confirmed applying the migration and authorized deployment so packaging could be assigned in the dashboard. This workspace has not changed production secrets or product data. Manual products still need valid packaging and weight to return quotes.

## Existing product editor follow-up

The packaging menu uses a site-styled accessible combobox, including keyboard navigation, type-to-search, Escape and outside-click dismissal. It is available for existing manual products even with pick-your-own bundles enabled. A pick-bundle parent's saved packaging and weight describe ONE item. Each selected manual item inherits those settings (falling back to component weight only when the parent weight is unset). Two selected items submit two parcels to Shippo, each at the configured item weight; two two-item bundles submit four. Individual picks use one package per quantity. Fixed bundles also preserve one package per component unit. Printify components never enter Shippo parcels. No further migration is needed.

## Single-item selection and provider diagnostics

Buy-one mode now requires an explicit individual selection before adding to cart. Cart quantity increments preserve the complete selection metadata; configurable wishlist items route to the selector and configurable products are excluded from one-click suggestions. Incomplete entries from older carts display a replace link and cannot submit an ambiguous checkout. Bundle mode respects the requested bundle quantity.

US state autofill values such as Virginia and Virginia (VA) normalize to VA for Shippo (origin/destination) and Printify quotes. Shippo authentication failures, rejected shipment details, timeouts, connection failures, malformed responses and empty rates retain distinct messages. Server diagnostics record status or a fixed failure category, never raw provider bodies, addresses or credentials. The actual production Shippo failure remains unconfirmed: the tests use mocked provider responses; live hosting logs are required to distinguish the cause.

## Deployed connection check

Admin → Products → Check Shippo connection runs an authenticated, staff-only GET to Shippo's carrier account list. It uses the deployed SHIPPO_API_KEY and reports only presence of the five origin configuration fields, token mode (not its value), upstream HTTP status, and active-carrier count. It never creates shipments, purchases labels, changes credentials, or returns carrier credential objects/addresses. Responses are no-store.

Results distinguish missing_key, authentication_failed, missing_origin, no_active_carriers, timeout, connection_failed, provider_error and connected. A connected result verifies credential/carrier access, not destination-specific rate availability. The cart's separate quote errors and hosting logs remain necessary for shipment rejection details.

During this audit, the managed coding environment had no Shippo or Netlify credentials. Attempts to reach the public storefront and provider documentation were denied by its restricted outbound host policy (proxy HTTP 403), before reaching either service. This is an environment restriction, not evidence that production Shippo authentication fails. No live provider test was possible from this workspace.
