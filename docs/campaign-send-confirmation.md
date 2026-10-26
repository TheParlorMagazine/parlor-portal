# Send Now acceptance reporting

The shared campaign/newsletter sender now checks Resend's returned `error` and verifies a unique provider email ID for every item in each batch. Only complete acceptance marks a campaign `sent` and sets `sent_at`. This means accepted by Resend, not delivered, opened or read.

Campaign statuses use the existing text column; no migration is required:

- `failed`: explicit provider rejection or a pre-send error, with no accepted recipients. Fix the error before retrying.
- `partial`: earlier batches were accepted and a later batch was explicitly rejected. The accepted count is retained; do not resend the entire campaign.
- `uncertain`: transport/server errors, incomplete provider confirmation, or acceptance that could not be recorded reliably. Check Resend before retrying.
- `sending`: a send is claimed or in progress. A process interruption can leave this state; it must be reviewed rather than blindly restarted.

An atomic status/count-guarded update claims each campaign once. Campaigns in progress, already sent, partially accepted or uncertain cannot be automatically restarted. Progress is saved after each accepted batch. The admin interface shows the new states and disables resending review-required campaigns. A known zero-accepted newsletter failure can retry the same saved snapshot; the button and confirmation identify that saved version. Failed newsletter snapshots are retained instead of deleted.

The Campaigns and Newsletter APIs return non-success HTTP responses for rejection/partial/uncertain results. Newsletter preview refreshes preserve the last send result. Recipient/segment database errors are surfaced rather than reported as an empty audience.

Historical rows previously marked `sent` have not been reverified against Resend. Scheduled campaign dispatch, recipient pagination, unsubscribe/re-subscribe behavior, digest reporting and delivery/open/click webhooks are outside this change. Separate new newsletter requests still represent new sends; inspect Resend before deliberately starting another send of the same content after an unknown outcome.

Validation uses mocked provider responses only: `tests/campaign-send.test.cjs` and the real admin UI in `tests/campaign-send-browser.cjs`. No live emails or campaigns were triggered. Build compilation passes; full page-data collection remains blocked by the absent Resend key in this cloud workspace.
