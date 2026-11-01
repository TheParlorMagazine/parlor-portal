BEGIN;
SET LOCAL lock_timeout='5s';
-- Extend, never rewrite, the already-applied republication metadata migration.
DO $preflight$
DECLARE actual record;
BEGIN
  IF to_regclass('public.articles') IS NULL THEN RAISE EXCEPTION 'Missing public.articles'; END IF;
  LOCK TABLE public.articles IN ACCESS EXCLUSIVE MODE;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.articles'::regclass AND conname='articles_republication_attribution_v2_check') THEN
    RAISE EXCEPTION 'Apply 20261028100000_republication_attribution.sql first';
  END IF;
  SELECT format_type(a.atttypid,a.atttypmod) AS type_name,a.attnotnull,a.attgenerated,
    pg_get_expr(d.adbin,d.adrelid) AS default_value INTO actual
  FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
  WHERE a.attrelid='public.articles'::regclass AND a.attname='republication_authors' AND a.attnum>0 AND NOT a.attisdropped;
  IF FOUND AND (actual.type_name<>'jsonb' OR NOT actual.attnotnull OR actual.attgenerated<>'' OR
      actual.default_value IS NULL OR regexp_replace(actual.default_value,'[()[:space:]]','','g')<>'''[]''::jsonb') THEN
    RAISE EXCEPTION 'Incompatible existing republication_authors definition. Review schema; nothing changed.';
  END IF;
END;
$preflight$;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS republication_authors jsonb NOT NULL DEFAULT '[]'::jsonb;

-- An empty array preserves legacy single-author articles without a backfill.
-- Empty names are allowed only in unfinished, unscheduled drafts.
CREATE TEMP TABLE parlor_expected_republication_authors (
  republication_authors jsonb,is_republished boolean,published boolean,scheduled_at timestamptz,
  CONSTRAINT expected_authors_shape CHECK (
    jsonb_typeof(republication_authors)='array' AND NOT jsonb_path_exists(republication_authors,
      '$[*] ? (@.type() != "object" || !exists(@.name) || @.name.type() != "string" || (exists(@.bio) && @.bio.type() != "string") || (exists(@.photo_url) && @.photo_url.type() != "string") || (exists(@.profile_url) && @.profile_url.type() != "string"))')),
  CONSTRAINT expected_authors_credit CHECK (NOT is_republished OR (published IS NOT TRUE AND scheduled_at IS NULL) OR
    NOT jsonb_path_exists(republication_authors,'$[*] ? (@.name like_regex "^[[:space:]]*$")'))
) ON COMMIT DROP;
DO $constraints$
DECLARE pair record; existing_def text; expected_def text;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('articles_republication_authors_shape_check','expected_authors_shape'),
    ('articles_republication_authors_credit_check','expected_authors_credit')
  ) AS names(existing_name,expected_name) LOOP
    SELECT pg_get_constraintdef(oid) INTO expected_def FROM pg_constraint
      WHERE conrelid='pg_temp.parlor_expected_republication_authors'::regclass AND conname=pair.expected_name;
    SELECT pg_get_constraintdef(oid) INTO existing_def FROM pg_constraint
      WHERE conrelid='public.articles'::regclass AND conname=pair.existing_name;
    IF FOUND THEN
      IF replace(existing_def,' NOT VALID','')<>expected_def THEN
        RAISE EXCEPTION 'Unexpected constraint definition for %; nothing changed.',pair.existing_name;
      END IF;
      EXECUTE format('ALTER TABLE public.articles VALIDATE CONSTRAINT %I',pair.existing_name);
    ELSE
      EXECUTE format('ALTER TABLE public.articles ADD CONSTRAINT %I %s',pair.existing_name,expected_def);
    END IF;
  END LOOP;
END;
$constraints$;
COMMIT;
