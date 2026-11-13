# Subscriber profile actions

The profile action forms call `/api/admin/subscribers/actions`, authenticated with the admin's Supabase session. Only `admin` and `finance_admin` can read billing context or change subscribers. Team accounts must be managed separately. No database migration is needed.

- **Upgrade/downgrade:** saves local membership access. Linked Stripe subscriptions change to the server-configured recurring price without proration. Different currencies or billing intervals require review in Stripe. A manual access grant never creates a subscription or charges a customer. Existing newsletter opt-outs remain unchanged.
- **Cancel:** defaults to cancellation at the end of the paid period for linked Stripe subscriptions. Access remains until the existing Stripe cancellation webhook clears it. Immediate cancellation is an explicit option. The form shows scheduled cancellation and permits restoring renewal. Unlinked/manual access is removed immediately; Wix changes require confirmation that billing was changed externally first.
- **Refund:** choose a refundable membership invoice from the most recent 20 paid Stripe invoices and enter an amount in that invoice's currency. The server checks invoice ownership, membership linkage, payment eligibility and remaining refundable amount. Shop purchases are excluded. Refunds leave membership and consent unchanged.
- **Remove subscriber:** stops newsletter delivery, preserving the account, paid access and payment/order history. It does not permanently delete the account or cancel billing. The confirmation explains this explicitly.
- **Notes:** updates appear only after a confirmed database save; errors preserve the text for retry.

Financial requests use operation UUIDs and Stripe idempotency keys. Retrying the same refund operation checks for an existing refund. A successful provider change followed by a failed database save is reported as requiring review rather than reporting false success. Member saves also guard against a changed Stripe subscription link. Unknown provider errors do not expose credentials or raw provider payloads.

Required Stripe configuration: `STRIPE_SECRET_KEY`, `STRIPE_READERS_CIRCLE_PRICE_ID`, `STRIPE_PRINTING_PRESS_PRICE_ID`. Local access/consent actions do not require Stripe credentials. API IDs come from the saved member and configured prices, never browser-supplied billing IDs.

Validation: mocked service/route tests cover authorization, persistence failures, ownership, idempotency, refund limits, scheduled/immediate cancellation, external billing and consent preservation. Browser tests cover confirmation forms, save failures/retries, successful profile updates and mobile layout. No real subscriber was changed and no live payment was refunded during verification. Bulk action controls are outside this change.

## Paid cancellation and churn

No new table or migration is required. Keep the existing member's `plan` label as the reporting association, set `subscription_status` to `churned` when paid access ends, and clear the active Stripe subscription and plan ID. Plan pages read the existing members table directly, include churned subscribers and exclude them from active totals and estimated MRR. Paid-content and print-access checks use billing status, independently of newsletter consent. Scheduled cancellations keep paid access until the period ends; new subscriptions restore active status.

If an earlier cancellation already cleared the plan label, use **Set former plan** in that churned subscriber's profile to select the known former plan. This updates the existing member's plan label only; it does not restore access, modify billing or change newsletter preferences. No live subscriber data was changed during development.
