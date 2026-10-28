# Article republication credits

Implemented locally on `fix/campaign-email-styling`, alongside pending email-link
and subscriber-status changes. No production SQL or live article changes are performed by this feature’s tests.
Release commits and deployment status are reported separately in the handoff.

## Final author model

Per the latest instruction, republished articles are not associated with Parlor
writers: `author_id` must be NULL. The manually entered original author is stored
in existing `author_name`. No additional original-author column is necessary when
these identities cannot coexist on the same article. Republished saves remove
Parlor headshot/profile/bio snapshots to avoid pairing someone else's identity
with the original author. Ordinary articles keep their normal author relationships
and writer behavior. The Parlor Editors is a presentation fallback only for
non-republished articles, never an original-author substitute.

The CMS Republished Article checkbox shows original author/publication/logo/source/
date/license controls and hides the normal writer selector. While editing, toggling
back restores the previous in-session Parlor author and preserves source metadata.
After saving and reloading a republished article, that old association has been
intentionally removed; select a Parlor writer if converting it back. Disabling the
flag hides republication metadata without silently deleting the stored metadata.

## Display

Directly beneath the original author's byline:

Originally published by [Publication Name] on [Original Publication Date].

- Publication name links ONLY to valid `original_article_url`.
- A missing article URL leaves the publication name as plain text; the publication
  homepage URL is never a fallback and no separate Original Article link appears.
- Missing original date omits “on [date]” without dangling punctuation.
- Optional license name appears on its own line immediately below attribution,
  linked to a valid license URL when supplied, otherwise plain text.
- No license is assumed or automatically assigned. Logo is optional and uses
  contain rather than a portrait crop. Normal articles show none of this metadata.
- Existing article fonts and byline sizing are preserved for standalone/issue
  articles. Public pages, CMS preview and social cards use the manual original
  author rather than a live Parlor writer for republished pieces.

Custom React article templates retain their own markup; the common byline applies
to standard article rendering and its issue hero. Cards/search already consume the
existing author_name snapshot, so no schema-wide API response renaming is needed.
Metadata, original-author relationships, publication state, access-control rules,
RLS and grants for ordinary existing articles are not changed.

## Migration and release

Review `supabase/migrations/20261028100000_republication_attribution.sql`.
It is the self-contained replacement for the earlier UNCOMMITTED 09:00 proposal.
The old proposal is archived outside the repository at
`/workspace/republication-audit/superseded-20261028090000_article_republication.sql`.
Do not apply that older file. If it was already applied manually, the new migration
also supports that known shape: it retains/verifies its author-null restriction
and replaces its credit check with publication/scheduling-aware validation.

The new migration:
- verifies existing metadata types, nullability, generated definitions and defaults
  before relying on ADD COLUMN IF NOT EXISTS;
- rejects unexpected same-name constraint definitions instead of blindly dropping
  or trusting them;
- adds the eight proposed columns only when absent;
- allows incomplete unscheduled drafts, but requires author/publication names for
  published or scheduled republished articles and a NULL writer association;
- preserves all rows and existing metadata, with no guessed backfill;
- aborts and rolls back if existing republished rows have conflicting author
  associations or incomplete published/scheduled credit, requiring explicit review;
- changes no policies/grants and uses the normal ALTER TABLE lock with a five-second
  lock timeout. Apply during an appropriate quiet period.

Actual production definitions have not been verified. Use the read-only catalog
inspection from `/workspace/republication-audit/schema-check.sql` before applying.
Apply the reviewed new migration to enable republication. If it has not been
applied, the CMS disables the new toggle and explains why. Ordinary legacy article
saves omit the new columns, and share-card projections stay backward compatible.
Existing content remains editable while the migration is pending.
Only merge/deploy/run production SQL after separate authorization.

Rollback application code first and retain additive metadata/author records.
Do not drop populated columns. Any rollback of checks must be reviewed against
saved republications and must not invent author associations or licenses.

## Validation

184 unit/API tests passed. Disposable PostgreSQL tests cover repeatability,
compatible earlier proposal, incompatible types/defaults/nullability, unexpected
constraints, rollback, untouched existing authors/grants, draft/publish/schedule
requirements and no silent data repair. Browser tests exercise the actual CMS
save/reload/publish/toggle workflows and phone/tablet/desktop bylines: source URL
priority, plain-text fallback, omitted dates, linked/plain/absent licenses, no
metadata on ordinary articles, preserved in-session author selection, and editorial
fallback limited to normal articles. Subscriber and email-layout regressions pass.
Production build passed using placeholder keys/local endpoints; no real emails,
payments, provider changes, production article writes or live SQL were performed.
