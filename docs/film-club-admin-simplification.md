# Film Club editor update

Apply `supabase/migrations/20261126110000_film_club_simplify_admin.sql` after the existing Film Club ticket migration, before deploying this branch's matching code. This is a new follow-up migration; the original migration is unchanged. It adds fee currency/retry timestamps, derives sales and live viewing dates from the event, and updates ticket RPCs to remove the retired authorization-checkbox gates. Existing authorization notes are retained; no authorization is fabricated. Existing checkout kinds, capacity protection, paid-order history and private ticket RLS remain in place.

## What happens automatically

- Sales stop at the event start, checked on the server and in the reservation RPC. Changing the event time updates the stored deadline. The existing checkout reconciliation also expires still-open Film Club checkout sessions after the start; a payment already in progress is reconciled rather than discarded. Live viewing follows event start/end; flexible viewing can keep its own window.
- Set an event end time. A new independent Netlify scheduled function (`film-ticket-maintenance`) archives the Film Club Stripe product and its active prices after that time. It retries uncertain failures, disables local sales before Stripe mutations, checks product identity and retains purchase records. It processes one product per pass, so archival occurs on a subsequent scheduled pass rather than at an exact second. Ordinary inventory reconciliation is unchanged.
- Actual Stripe charge processing fees and their settlement currency populate automatically after payment. Delayed balance transactions retry in maintenance, two tickets per pass. Unknown fees stay pending; the Overview converts amounts to USD using dated ECB reference rates before combining them. Hypothetical profitability scenarios have no invented fee estimate.

## Netlify

The new scheduled function uses the existing `INVENTORY_RECONCILE_SECRET` and `INVENTORY_RECONCILE_ORIGIN` (or Netlify `URL`). Include the existing secret in Functions scope. Netlify runs scheduled functions only on the published production deploy, not branch previews. Film Club Stripe archival still honors `FILM_CLUB_LIVE_STRIPE_APPROVED`; test keys allow test operations. No live Stripe mutations were performed during implementation. Sales still honor `FILM_CLUB_TICKET_SALES_ENABLED`.

Local validation covers both ticket migrations with the existing commerce migrations in disposable PostgreSQL, application regression tests, a production build, and desktop/mobile component interactions. Production scheduled execution needs deployment verification.


## Ticket fields and combined revenue

Ticket settings, capacity, viewing options, provider costs and the host-share toggle now live together in Tickets. The ticket price is the public price; member pricing is derived from the discount. Saving clears a legacy override and the existing pricing-version logic requires Stripe resynchronization when that changes the price. Historical purchases keep their paid amount. Private-license cost and scenario controls are removed from this editor; historical database fields are retained. Language defaults to English, with a dropdown that preserves existing language values. Runtime uses an integer number selector.

Overview reads every ticket receipt for the selected screening, independently of the ticket-management/export row cap. It shows Stripe gross receipts plus manually reported external gross sales as total gross ticket sales. Retained revenue is Stripe receipts after refunds/dispute holds plus the configured host share of external sales. Net subtracts the configured per-Stripe-ticket provider cost, other expenses and actual Stripe fees. Missing external totals, costs or fees remain pending; amounts in different currencies are converted using the published reference rate before combining them. Enter external sales only, excluding provider tickets acquired to fulfill Stripe purchases, to avoid double counting.

This editor/revenue refinement requires no new migration beyond the already applied simplification migration.

Film metadata import has been removed; film details are entered directly. Disclosures use down/up chevrons and retain native keyboard controls. Stripe synchronization now happens when saving; publishing and opening sales use one action.


## Automatic Stripe setup and publishing

Apply `20261126160000_film_club_publish_sales.sql` after the existing simplification migration before deploying the matching code. It adds one service-only function; it does not replace existing functions or change existing orders. The function uses the existing commerce lock and pricing version to publish the event and enable sales in one transaction. If validation fails, both changes roll back.

- **Save changes** saves the form and creates/updates Stripe pricing when needed. Repeated non-price edits reuse the existing product/price. Saving drafts, paused, cancelled or archived screenings does not open sales or resurrect archived products. An existing open sale remains open for non-price edits. Changing the price pauses sales; successful synchronization leaves it ready for the explicit open-sales action.
- **Publish and open ticket sales** saves the current form, synchronizes Stripe, then publishes and opens sales atomically. A valid future start, an event end, and `FILM_CLUB_TICKET_SALES_ENABLED=true` are required. Stripe test/live guards still apply. The button does not bypass deployment configuration.
- **Pause sales** stops new checkouts without requiring a working Stripe connection. Unsaved editor changes are retained when pausing.
- If settings save but Stripe or publishing fails, the editor reloads the saved settings and shows an error with the retry action. Drafts are not published by a failed Stripe call. Durable product/price operation IDs make retries reuse the same ticket setup.

No live Stripe calls were made during implementation. The additional migration has been tested locally, not applied to production.


## Pink calendar controls

Film Club screening, viewing-window and access-expiry fields now use a shared calendar styled to match The Parlor. Selected dates, focus and text highlights use pink. The calendar opens above the modal in the browser's popover layer; Escape closes the calendar without closing the editor. Arrow keys, Home/End and Page Up/Down navigate dates. Dates remain local to the user's browser and are sent to the server as ISO timestamps, at minute precision. Manual entry supports `dd/mm/yyyy, hh:mm` and local ISO input; invalid dates and daylight-saving gaps are rejected before saving. No database migration is required for this visual update.


Manual archival appears only in the main Overview after the event end time, for screenings with a Stripe ticket product. Already archived products show their status instead of an action. The editor has no Advanced ticket controls section. Manual and scheduled archival share the same product identity checks, deactivate all active prices, retain order history, and record completion through the existing ended-screening RPC. Early requests are rejected before Stripe mutations. This change requires no additional migration.

## All-screening net dashboard

The main Film Club Overview now shows four analytics-style cards: recorded net revenue, revenue share earned (already included in net), recorded ticket purchases, and configured sharing rates with screening counts. It includes all screenings, past and present, including archived screenings. Sharing rates are listed individually rather than summed or averaged. The summary shows one combined USD amount, with foreign amounts automatically converted using dated ECB reference rates. Incomplete screenings are clearly marked and excluded from confirmed net totals.

Each screening has an expandable row with net revenue, included host share and its percentage, fees, provider costs, other expenses, the external-sales report and post-event archival controls. Search and past/current filters narrow the list without changing the all-screening totals. Saving an external report recalculates totals and keeps the expanded row open. A refresh action loads newly recorded Stripe transactions. Both screenings and receipts are paginated independently of the ticket-management/export cap. Aggregate results contain no member identities or viewing credentials. Provider reports remain entered in the screening’s original currency.

Net continues to include Stripe receipts after refunds/dispute holds plus the configured share of reported external sales, minus recorded Stripe fees, configured provider ticket costs and other expenses. No gross-sales figure is shown as the dashboard headline.

Member screening refund requests are explicitly rejected by the member ticket POST API, and ordinary members cannot use admin refund endpoints. The member purchase and ticket views state that refund requests are unavailable. Authorized admin/finance refunds and Stripe refund/dispute reconciliation remain intact. No migration is required for this update.


## USD reporting and The Parlor styling

Overview uses the existing Analytics styling: Source Serif 4 body text, Playfair Display values, white bordered cards, restrained pink/burgundy accents and a single expandable screening ledger with matching filter pills. Each money card contains one combined USD figure, not stacked currencies. Sharing percentages remain the configured contractual rates, not converted or added together.

The server retrieves ECB reference quotes through Frankfurter v1, caches them for one hour, and returns the rate date and dollar-per-currency quote with the report. This is a current reference-rate reporting conversion, not a change to historical purchase currencies, Stripe charges or payouts. Net converts receipts/sharing/costs into USD and subtracts fees in their actual recorded settlement currency. If a quote is unavailable, unconverted values remain pending and excluded from confirmed totals. No API key or migration is needed. The development workspace blocks direct outbound requests to the provider; rate parsing, conversion and outage behavior were tested with fixtures. Deployed provider connectivity still requires verification.

Local UI previews use sample data clearly labeled as such; those figures are never seeded into production.
