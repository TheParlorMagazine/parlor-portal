BEGIN;

-- Existing purchased_at and id defaults are intentionally left unchanged.
-- One-time digital access. Existing installations may already have this table.
CREATE TABLE IF NOT EXISTS public.item_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('article', 'audio', 'video')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, article_id, item_type)
);
CREATE UNIQUE INDEX IF NOT EXISTS
  item_purchases_member_article_type_uidx
ON public.item_purchases (
  member_id,
  article_id,
  item_type
);

ALTER TABLE public.item_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read own item purchases" ON public.item_purchases;
CREATE POLICY "Members read own item purchases" ON public.item_purchases
  FOR SELECT TO authenticated USING (member_id = auth.uid());
-- Payment fulfillment writes through the server service role only.
REVOKE INSERT, UPDATE, DELETE ON public.item_purchases FROM anon, authenticated;
GRANT SELECT ON public.item_purchases TO authenticated;

GRANT ALL ON public.item_purchases TO service_role;
COMMIT;
