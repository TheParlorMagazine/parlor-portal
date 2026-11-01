BEGIN;
SET LOCAL lock_timeout='5s';
-- Self-contained replacement for the earlier, uncommitted republication proposal.
-- No backfill, writer unlinking, publication-state changes, grants or RLS changes.
DO $preflight$
DECLARE field record; actual record;
BEGIN
  IF to_regclass('public.articles') IS NULL THEN RAISE EXCEPTION 'Missing public.articles'; END IF;
  LOCK TABLE public.articles IN ACCESS EXCLUSIVE MODE;
  FOR field IN SELECT * FROM (VALUES
    ('is_republished','boolean',true),
    ('original_publication_name','text',false),('original_publication_logo_url','text',false),
    ('original_publication_url','text',false),('original_article_url','text',false),
    ('original_publication_date','date',false),('republication_license','text',false),
    ('republication_license_url','text',false)
  ) AS fields(name,type_name,required) LOOP
    SELECT format_type(a.atttypid,a.atttypmod) AS type_name,a.attnotnull,
      a.attgenerated,pg_get_expr(d.adbin,d.adrelid) AS default_value INTO actual
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid='public.articles'::regclass AND a.attname=field.name AND a.attnum>0 AND NOT a.attisdropped;
    IF FOUND THEN
      IF actual.type_name<>field.type_name OR actual.attnotnull<>field.required OR actual.attgenerated<>'' THEN
        RAISE EXCEPTION 'Incompatible existing column articles.% (type %, not-null %). Review schema; nothing changed.',field.name,actual.type_name,actual.attnotnull;
      END IF;
      IF field.name='is_republished' THEN
        IF actual.default_value IS NULL OR regexp_replace(lower(actual.default_value),'[()[:space:]]','','g') NOT IN ('false','false::boolean','''false''::boolean') THEN
          RAISE EXCEPTION 'Unexpected default for articles.is_republished; review schema before continuing.';
        END IF;
      ELSIF actual.default_value IS NOT NULL AND actual.default_value NOT IN ('NULL::text','NULL::date') THEN
        RAISE EXCEPTION 'Unexpected default for articles.%; review schema before continuing.',field.name;
      END IF;
    END IF;
  END LOOP;
END;
$preflight$;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_republished boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_publication_name text,
  ADD COLUMN IF NOT EXISTS original_publication_logo_url text,
  ADD COLUMN IF NOT EXISTS original_publication_url text,
  ADD COLUMN IF NOT EXISTS original_article_url text,
  ADD COLUMN IF NOT EXISTS original_publication_date date,
  ADD COLUMN IF NOT EXISTS republication_license text,
  ADD COLUMN IF NOT EXISTS republication_license_url text;

-- Compare canonical PostgreSQL expressions, rather than trusting constraint names.
CREATE TEMP TABLE parlor_expected_republication (
  is_republished boolean,author_id uuid,author_name text,published boolean,
  original_publication_name text,scheduled_at timestamptz,
  CONSTRAINT expected_old_author CHECK (NOT is_republished OR author_id IS NULL),
  CONSTRAINT expected_old_credit CHECK (NOT is_republished OR published IS NOT TRUE OR
    (nullif(btrim(author_name),'') IS NOT NULL AND nullif(btrim(original_publication_name),'') IS NOT NULL)),
  CONSTRAINT expected_new_credit CHECK (NOT is_republished OR (published IS NOT TRUE AND scheduled_at IS NULL) OR
    (nullif(btrim(author_name),'') IS NOT NULL AND nullif(btrim(original_publication_name),'') IS NOT NULL))
) ON COMMIT DROP;
DO $constraints$
DECLARE pair record; existing_def text; expected_def text;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('articles_republished_author_check','expected_old_author'),
    ('articles_republished_credit_check','expected_old_credit'),
    ('articles_republication_attribution_v2_check','expected_new_credit')
  ) AS names(existing_name,expected_name) LOOP
    SELECT pg_get_constraintdef(oid) INTO existing_def FROM pg_constraint
      WHERE conrelid='public.articles'::regclass AND conname=pair.existing_name;
    IF FOUND THEN
      SELECT pg_get_constraintdef(oid) INTO expected_def FROM pg_constraint
        WHERE conrelid='pg_temp.parlor_expected_republication'::regclass AND conname=pair.expected_name;
      -- NOT VALID is an inspection detail, not a different expression.
      IF replace(existing_def,' NOT VALID','')<>expected_def THEN
        RAISE EXCEPTION 'Unexpected constraint definition for %; nothing changed.',pair.existing_name;
      END IF;
      IF pair.existing_name='articles_republished_credit_check' THEN
        EXECUTE format('ALTER TABLE public.articles DROP CONSTRAINT %I',pair.existing_name);
      END IF;
    END IF;
  END LOOP;
  -- Never silently unlink existing authors or manufacture missing attribution.
  IF EXISTS(SELECT 1 FROM public.articles WHERE is_republished AND author_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Existing republications have linked Parlor authors. Review explicitly; no relationships were changed.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.articles'::regclass AND conname='articles_republished_author_check') THEN
    ALTER TABLE public.articles ADD CONSTRAINT articles_republished_author_check
      CHECK (NOT is_republished OR author_id IS NULL);
  ELSE
    ALTER TABLE public.articles VALIDATE CONSTRAINT articles_republished_author_check;
  END IF;
  IF EXISTS(SELECT 1 FROM public.articles WHERE is_republished AND (published IS TRUE OR scheduled_at IS NOT NULL)
      AND (nullif(btrim(author_name),'') IS NULL OR nullif(btrim(original_publication_name),'') IS NULL)) THEN
    RAISE EXCEPTION 'Existing published/scheduled republications need original-author attribution review. No records were changed.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.articles'::regclass AND conname='articles_republication_attribution_v2_check') THEN
    ALTER TABLE public.articles ADD CONSTRAINT articles_republication_attribution_v2_check
      CHECK (NOT is_republished OR (published IS NOT TRUE AND scheduled_at IS NULL) OR
        (nullif(btrim(author_name),'') IS NOT NULL AND nullif(btrim(original_publication_name),'') IS NOT NULL));
  ELSE
    ALTER TABLE public.articles VALIDATE CONSTRAINT articles_republication_attribution_v2_check;
  END IF;
END;
$constraints$;
COMMIT;
