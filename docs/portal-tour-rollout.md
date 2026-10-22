# Optional member walkthrough

## Supabase integration

Run the entire `supabase/migrations/20261022_member_portal_tour.sql` file in the Supabase SQL editor, from BEGIN through COMMIT. This is a **separate migration** from the event/waitlist migration already applied. It adds only:

- `portal_tour_config`: a stable launch timestamp.
- `member_portal_tour_state`: member ID, version, status, last chapter, update and completion timestamps.

Both tables have RLS enabled and are accessible only through authenticated server API routes using the existing server-side service-role binding. No additional secret, external service, cron, auth redirect, signup trigger, payment field or welcome-email field is needed. The API derives ownership from the verified session and ignores caller-supplied member IDs.

The migration is repeatable and does not reset progress or its launch timestamp. It does not change any event tables or existing member data. Automatic invitations apply to accounts created on/after the launch timestamp, on their first authenticated dashboard visit. Older accounts can always opt in with the burgundy question-mark help button. Welcome-email visitors get the same invitation when they reach the dashboard; authentication redirects remain unchanged.

## Experience

The five chapters are profile/short posts, article drafts, forums, events, then Archive search. Each chapter navigates to the actual feature, highlights a real control and offers a gently pulsing Click here / Tap here cue. The events chapter still works when no events are scheduled. Host-only controls are explained without exposing or activating them for ordinary members.

Start Tour, Maybe Later and Skip Tour are independent choices. A postponed tour leaves a quiet dashboard reminder; the help menu offers restart, resume and individual topics. Completing or skipping suppresses automatic invitations. Pausing or pressing Escape preserves the current chapter. Completion leaves the member in the Archive.

Guidance opens only composers/forms/event details or focuses search; it never posts, submits, accepts consent, joins a forum, or RSVPs. If a member starts typing in an opened form, moving between chapters asks them to finish/save first. Existing article autosave remains unchanged. Desktop guidance uses a floating card; mobile uses a compact bottom card. Reduced-motion preferences disable pulsation. The introduction uses a native modal dialog with focus containment; chapter guidance is modeless so members can interact with the real page.

Saved Supabase state follows the member across devices. Per-user browser storage provides a fallback and a tab-only active-tour marker. Failed writes remain pending and retry on the next portal visit. The UI explicitly says when account sync is unavailable. A missing migration never blocks the dashboard, but progress cannot sync across devices until the migration is applied. Browser storage contains only tour progress, never credentials.

## Validation

```sh
node --experimental-vm-modules --test tests/portal-tour.test.cjs
python tests/portal-tour-db.py
# Optional isolated browser tooling, outside the repository:
npm install --prefix /tmp/parlor-tour-validation esbuild playwright-core
node tests/portal-tour-browser.cjs
npm run build
```

Database tests use a disposable PostgreSQL 16 Docker container. Chromium harness tests run the actual tour component with mocked auth, page targets and progress API; they exercise desktop/mobile navigation, all chapters, postpone, skip, restart, completion, focus, Escape and reduced motion. They do not establish live Supabase/authentication behavior. The normal app build compiles, but page-data collection still requires existing Resend configuration. No production service or production credential is used by these checks.

After applying the migration, check one new member's invitation, welcome-email arrival via existing login, returning member help/restart, and cross-device completion in a non-production environment. Keep existing event changes and this tour migration distinct during review.

Read-only verification after running the migration:

```sql
select id, launched_at from public.portal_tour_config;
select status, count(*) from public.member_portal_tour_state group by status;
```
