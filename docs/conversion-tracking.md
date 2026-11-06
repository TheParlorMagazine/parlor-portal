# Purchase and signup measurement

The shared consent component sends these events to the configured
`NEXT_PUBLIC_GA_MEASUREMENT_ID` GA4 destination. Google Ads continues to load using
`AW-17582286057`. No Ads conversion labels are guessed or hardcoded.

- `purchase`: a server-verified, completed, paid Stripe checkout owned by the
  signed-in member (or a verified matching legacy guest). Covers shop and
  Trick-or-Treat orders, initial paid membership checkouts, and one-time
  article/audio/video purchases. Uses the checkout session as `transaction_id`,
  actual currency, merchandise value excluding shipping/tax, shipping, tax, and
  product IDs/quantities/prices. Discounts are reflected in the paid amounts.
  Stripe zero-decimal currencies are handled without dividing by 100.
- `sign_up`: a verified initial email or Google registration, using the existing
  server-side initial-registration eligibility checks. Existing accounts,
  failed signups, unverified email requests and password resets do not qualify.
- `newsletter_signup`: a successful opt-in saved through account settings.
  This is separate from account creation; the newsletter automatically included
  in a new membership is not counted as another acquisition event.

Conversion events require analytics consent and respect Do Not Track / Global
Privacy Control. Email addresses, names, addresses and internal member IDs are
not sent to Google. Event page locations omit query strings and fragments.
Admin/dashboard visits do not query conversion data. Private pages may initialize
the Google loader after consent to deliver a confirmed conversion, without
emitting a manual page-view event.

Deduplication uses an in-memory set and local browser storage. The transaction ID
also enables GA4 purchase deduplication. This is browser measurement: it cannot
guarantee delivery if the browser blocks Google, the visitor never returns from
Stripe, clears local storage, or never grants analytics consent. Recurring
membership renewals, refunds, and server-to-server measurement are not included.
Pending payments are polled briefly; delayed payments confirmed after that window
can be picked up by revisiting the confirmation URL. No live payments or email
signups are created by tests.

## Finish configuration in Google

1. In the linked GA4 property, confirm `purchase`, `sign_up` and (if needed)
   `newsletter_signup` in Realtime / DebugView after representative successful
   flows. Use Tag Assistant to verify value, currency and transaction ID.
2. Mark `sign_up` as a key event in GA4. `purchase` is normally already a key
   event; verify this in the property. Mark `newsletter_signup` separately only
   if newsletter opt-ins are a reporting goal.
3. In Google Ads, link this GA4 property if needed and import its purchase and
   signup key events as conversion actions. Choose purchase values from GA4;
   account signups generally use a fixed value or no monetary value.
4. Avoid counting an existing direct Ads purchase action and an imported GA4
   purchase as two primary conversions for the same transaction. Choose which
   action is primary for campaign bidding. Newsletter and account creation are
   distinct events; choose their bidding roles intentionally.

The code does not change Google account settings. Merchant Center product feeds
and listings are independent of these conversion events.

## Validation

```
NODE_PATH=/workspace/parlor-portal/node_modules node --experimental-vm-modules --test tests/*.test.cjs
node tests/conversion-tracking-browser.cjs
node tests/cookie-consent-browser.cjs
```

Browser tests require the existing external test helpers under
`/tmp/parlor-tour-validation/node_modules` (esbuild and playwright-core) and
`/usr/bin/chromium`. Browser Google requests are intercepted for deterministic
validation; they do not establish live Google ingestion.
