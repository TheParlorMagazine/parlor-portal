# Multiple external authors and biographies

Developed on fix/campaign-email-styling. Tests perform no live article edits,
emails or production SQL. Release/merge status is reported separately in the handoff.

The republished Author section supports multiple named authors. Each author has a
plain-text biography (paragraph breaks preserved), optional headshot and optional
external website/profile URL. Add/remove authors without creating Parlor writer
profiles. Names are displayed in their saved order in the byline. Biographies
appear after the article body and before comments, using the regular article
About the author layout/fonts. Each named author with a nonblank biography gets
an individual entry. Missing photos use the regular initial-circle fallback.
No biographies or additional metadata are shown on ordinary articles.

Publication attribution remains immediately beneath the byline and links only to
the original article URL, with the previously specified optional date/license
behavior. It is not repeated for each author. This extension does not redesign
normal Parlor author sections or change article access/publishing controls.

Storage: one new column, articles.republication_authors (jsonb array). Entries
contain name, bio, photo_url and profile_url strings. author_name remains a readable
name-list snapshot for existing cards/search/social/API clients. Primary bio/photo/
profile fields mirror the first author for compatibility. author_id remains NULL
for republications. Old single-author records with an empty or absent list retain
their existing byline and are never split on punctuation. Ordinary author identity
and existing metadata are not rewritten. Bios are rendered as escaped text rather
than HTML; author links/images must be HTTP(S), with credentials rejected.

## Migration

The user already applied 20261028100000_republication_attribution.sql. Do not edit
or reapply it for this feature. Review the NEW migration:

supabase/migrations/20261028110000_republication_authors.sql

It verifies the prerequisite, checks an existing same-name column's type,
nullability/default/generated definition, adds only the new column when absent,
and validates array/object/string shapes and nonblank names for publication or
scheduling. Incomplete unscheduled drafts are allowed. Old rows receive an empty
array; no name, biography, relationship, publication status, policy or grant is
updated. Constraint definitions are verified before reuse. Incompatible schemas
or data cause transaction rollback for review rather than guessed conversion.

Apply the reviewed migration to enable the new controls. The CMS probes the new
column independently of the original republication fields: if the authors migration
is missing, legacy single-author editing and ordinary articles continue working,
and the new controls show a clear unavailable message. No new field is included in
legacy save payloads. Applying the migration does not by itself publish any article.

Standard public articles, issue heroes and CMS previews use the combined byline
and the new bottom biographies. Custom React templates retain their own markup.
Rollback application code first, retaining the additive author data. Do not drop
populated columns or overwrite old snapshots. Merge/deploy/production SQL require
separate authorization.

## Validation

190 unit/API tests passed. The expanded actual CMS/browser test covers author
addition, empty-name publication rejection, separate bios/photos, save/reload,
removal without biography reassignment, source attribution and desktop/tablet/phone
bio rendering. It also checks escaped HTML in bios, safe profile links, no bios on
ordinary articles and missing-migration fallback. Disposable PostgreSQL tests cover
repeatability, legacy record/permission preservation, malformed JSON, draft versus
publish/schedule validation, NULL writer association and incompatible definition/
constraint rollback. Production build passed with placeholder keys/local endpoints.
