# Welcome email delivery and missed-send recovery

This repair does not send emails just by deploying code, loading Subscribers or viewing a subscriber profile.

## Diagnosed failures

- The Google onboarding route used `identities.some(...)`, a boolean, then read its `created_at`. Even valid initial Google registrations were therefore skipped.
- Email confirmation callbacks reaching `/auth/callback` called a Google-only endpoint. Fresh verified email registrations now qualify too, including callbacks whose templates omit `flow=signup`.
- The Subscribers table, profile and CSV did not all recognize `onboarding_email_sent`. They now share the same predicate as the sender, alongside `onboarding_sent` and `onboarding_sent_at`. Historical flags do not establish inbox delivery or provide a missing timestamp; the timeline still only uses real timestamps.
- An absent `ONBOARDING_LAUNCH_AT` previously silently disabled all automatic welcomes. An explicit valid value is still honored. Without an override, the conservative repair cutoff is `2026-11-01T00:00:00Z`. Accounts created before that date are not automatically mailed. Invalid explicit values fail closed.

## Automatic eligibility

Eligibility uses verified Supabase auth data, never client-supplied names, dates, addresses or a `flow=signup` parameter alone. Google registration must be within ten minutes, with its Google identity created alongside the account (within one minute). For browser callbacks, email registration must be within 24 hours of creation, with initial email confirmation within the last ten minutes and an email identity created alongside the account. The existing server-side OTP confirmation route keeps its trusted verification-event behavior, including delayed confirmation; it still checks the launch cutoff, verification status and duplicate guard. Old logins, recovery links for old accounts, unverified accounts and later-linked Google identities do not qualify. Browser callbacks outside those windows use explicit admin recovery instead. The normal confirmation redirect and login session exchange are unchanged.

The existing atomic `claim_welcome_onboarding(p_user_id)` and `release_welcome_onboarding(p_user_id)` database functions remain the duplicate guard. Verify these functions exist in the production database; their definitions are not available in this repository. The `members` columns `onboarding_email_sent`, `onboarding_sent` and `onboarding_sent_at` must exist (the previous implementation already depended on them). No schema is replaced by this repair.

The sender uses the verified auth email, honors the Welcome Email automation toggle, and supplies a stable Resend idempotency key per member as an additional safeguard. Provider idempotency has a limited retention window; the database claim remains necessary beyond it. Only Resend acceptance with an email ID records the sent flags and actual send timestamp. A disabled/rejected send releases its claim without success flags. Uncertain network outcomes (including Resend SDK `application_error` results), missing email-ID confirmations, or failed post-send database writes retain their claims and require inspection; they must never be blindly retried. Provider acceptance is not proof of inbox delivery.

## Recover the two missed welcomes

The owner checked Resend searches for the two October 30 registrations, with all statuses/API keys, and found no results in the relevant 15-day window. This workspace has no live Resend/Supabase credentials, so no actual emails or production records have been changed.

After deployment, open **Admin → Subscribers → View** for Louis Enclarke and Matthew Smith. Use **Send missed welcome email** once per subscriber, after checking the correct Resend account/history. The confirmation names the action. This is a single-subscriber action, not a bulk resend or an automatic login backfill.

The API `/api/admin/subscribers/onboarding` verifies an admin bearer session and role, accepts only a member UUID, loads the target auth account on the server, and requires a verified email. It does not accept arbitrary destination addresses or a force-resend option. Already-recorded welcomes return without sending. Pending claims return a conflict and must be investigated rather than cleared automatically. On accepted-and-recorded sends the profile/table/CSV update, including the real timestamp. Failures leave the status unchanged and display an explanation.

Check the Welcome Email automation is enabled, the server has `RESEND_API_KEY`/sender and Supabase credentials, and the claim functions are installed. If Resend shows an accepted email but the database update failed, repair its record after comparing the exact account/send history; do not resend merely to make the dashboard say Sent.

## Verification

Mocked integration tests exercise the real onboarding route/helper with Google/email registrations, concurrent claims, legacy flags, launch/verification safeguards, provider rejection/disable, uncertain sends and recording failures. Admin recovery tests verify access controls and duplicate protection. Callback tests cover missing signup-flow parameters and unchanged return destinations. Browser tests check profile recovery updates table and CSV only after successful acceptance. No live email is sent by these tests.
