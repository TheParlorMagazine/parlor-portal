# 28 October 2026 release audit

Branch: fix/campaign-email-styling. Compared with origin/main at
1a6380d5277efef8b0373ca4d090d00a223103fb; main is an ancestor, with no merge
conflicts or whitespace errors. Reverted login/reset files match main exactly.

Changes reviewed:
- Absolute campaign links in editor, saved rich text, CTA rendering and test emails;
  malformed http:///portal repairs to the canonical site URL. Existing delivered
  messages are not retroactively changed.
- Newsletter opt-outs presented as Churned in subscriber rows, drawer, filters and
  CSV, without modifying paid subscription status, consent or entitlement rules.
- Optional republication CMS/byline with manual original author and NULL writer
  FK, source-article-only attribution link, optional date and separate license
  line, no credits for ordinary articles, and normal-only Editors fallback.
- Additive schema migration with type/default/nullability/constraint checks and
  transaction rollback on mismatches. No production SQL was executed.

Confirmed rollout issue fixed during this audit: unconditionally saving new
metadata columns and selecting the new flag for social cards would fail before
migration. Legacy ordinary saves now omit absent metadata; the new CMS toggle
checks availability of all metadata fields, stays disabled on schema/query error,
and explains the issue. Social-image projections remain compatible with old
schema. Saved metadata and in-session author selection survive toggle changes.

Validation passed:
- 184 Node unit/API tests (all tests/*.test.cjs, --experimental-vm-modules).
- 14 Chromium browser suites: republication CMS/credits, portal tour, campaign
  email layout, campaign send outcomes, subscriber activity, subscriber profile,
  site tracker, live session drawer, live presence, Trick-or-Treat continuation,
  paid cart cleanup, order deletion, album replacement and migrated-password flow.
- Disposable PostgreSQL republication migration tests: fresh/repeated/earlier
  schema, existing records/permissions, draft/publish/schedule checks, bad column
  types/defaults/nullability, unexpected constraints and atomic rollback.
- npm run build using placeholder provider keys and local unreachable Supabase
  endpoint. No live provider operations were performed by tests.
- git diff --check and conflict-marker scan.

No confirmed unresolved code regressions were found by these checks. Production
schema, live DNS/provider settings and Netlify Published status are not certified
by local tests. Apply the reviewed 20261028100000 migration to enable republication;
if it has not been applied, ordinary functionality remains usable and the new
feature is unavailable. No production SQL is part of the merge. Main pushes may
trigger Netlify through the repository's existing deployment integration.
