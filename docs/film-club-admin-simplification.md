# Film Club editor update

Apply `supabase/migrations/20261126110000_film_club_simplify_admin.sql` after the existing Film Club ticket migration, before deploying this branch's matching code. This is a new follow-up migration; the original migration is unchanged. It adds fee currency/retry timestamps, derives sales and live viewing dates from the event, and updates ticket RPCs to remove the retired authorization-checkbox gates. Existing authorization notes are retained; no authorization is fabricated. Existing checkout kinds, capacity protection, paid-order history and private ticket RLS remain in place.

## What happens automatically

- Sales stop at the event start, checked on the server and in the reservation RPC. Changing the event time updates the stored deadline. The existing checkout reconciliation also expires still-open Film Club checkout sessions after the start; a payment already in progress is reconciled rather than discarded. Live viewing follows event start/end; flexible viewing can keep its own window.
- Set an event end time. A new independent Netlify scheduled function (`film-ticket-maintenance`) archives the Film Club Stripe product and its active prices after that time. It retries uncertain failures, disables local sales before Stripe mutations, checks product identity and retains purchase records. It processes one product per pass, so archival occurs on a subsequent scheduled pass rather than at an exact second. Ordinary inventory reconciliation is unchanged.
- Actual Stripe charge processing fees and their settlement currency populate automatically after payment. Delayed balance transactions retry in maintenance, two tickets per pass. Unknown fees stay pending; mixed currencies are displayed separately and never subtracted as if equal. Hypothetical profitability scenarios have no invented fee estimate.

## Netlify

The new scheduled function uses the existing `INVENTORY_RECONCILE_SECRET` and `INVENTORY_RECONCILE_ORIGIN` (or Netlify `URL`). Include the existing secret in Functions scope. Netlify runs scheduled functions only on the published production deploy, not branch previews. Film Club Stripe archival still honors `FILM_CLUB_LIVE_STRIPE_APPROVED`; test keys allow test operations. No live Stripe mutations were performed during implementation. Sales still honor `FILM_CLUB_TICKET_SALES_ENABLED`.

Local validation covers both ticket migrations with the existing commerce migrations in disposable PostgreSQL, application regression tests, a production build, and desktop/mobile component interactions. Production scheduled execution needs deployment verification.


## Ticket fields and combined revenue

Ticket settings, capacity, viewing options, provider costs and the host-share toggle now live together in Tickets. The ticket price is the public price; member pricing is derived from the discount. Saving clears a legacy override and the existing pricing-version logic requires Stripe resynchronization when that changes the price. Historical purchases keep their paid amount. Private-license cost and scenario controls are removed from this editor; historical database fields are retained. Language defaults to English, with a dropdown that preserves existing language values. Runtime uses an integer number selector.

Overview reads every ticket receipt for the selected screening, independently of the ticket-management/export row cap. It shows Stripe gross receipts plus manually reported external gross sales as total gross ticket sales. Retained revenue is Stripe receipts after refunds/dispute holds plus the configured host share of external sales. Net subtracts the configured per-Stripe-ticket provider cost, other expenses and actual Stripe fees. Missing external totals, costs or fees remain unavailable instead of being fabricated; settlement currencies are never mixed. Enter external sales only, excluding provider tickets acquired to fulfill Stripe purchases, to avoid double counting.

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
