# Cart shipping audit

Pending on fix/announcement-media-fields; no database migration.

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
- Parcel dimensions remain hardcoded to 12 x 9 x 0.5 inches for every manual shipment. Weight totals alone do not guarantee accurate rates for bulky goods. Actual packaging dimensions need to be specified before replacing these values.
- Shippo USD amounts are reused numerically for EUR/GBP under the existing shop currency policy; this is not an exchange-rate conversion.
- Existing manual free-shipping threshold remains 100 in the billing currency.
- Existing Printify flat fallback remains separate from Shippo handling.
- Existing Issues-category preference for Media Mail needs business review against carrier eligibility for actual publication contents.

No live Shippo requests, purchases, labels or production records were created during tests.
