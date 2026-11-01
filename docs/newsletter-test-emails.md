# Newsletter test emails

In **Admin → Emails → Newsletter**, choose **Send Test**, enter one email address and send. The button sits beside Refresh and the subscriber-send action. The test refreshes the live preview using the current section toggles, announcement and support overrides, then sends that HTML and subject through the existing protected `/api/admin/campaigns/send-test` endpoint. Issue/shop content uses the saved content, just as the live preview does.

Tests have a `[TEST]` subject prefix. The preview footer's unsubscribe link is inactive; no real subscriber token is included. Only the entered address receives the test. The action does not create or send a subscriber campaign, update audience metrics, or advance the newsletter schedule. Admin, editor and social-admin access matches existing campaign tests. Successful status requires a Resend email ID and means accepted for sending, not confirmed inbox delivery.

The recipient remains available for another test while the tab is open. Provider failures are shown in the dialog. Test sending is separate from subscriber-send outcomes and retry/review state. No real emails were sent during development: automated tests mock the provider and verify single-recipient sending, refreshed preview content, permissions, errors and no subscriber-send requests.

Changes are local on `feat/campaign-engagement-tracking` alongside the onboarding repair, pending deployment. Existing Resend/sender credentials are reused; no new database migration or API key is needed for newsletter tests.
