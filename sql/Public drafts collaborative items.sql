-- Public drafts are collaborative: any signed-in user can mutate items.
-- Private drafts stay readable by owner/members, but only the owner can write.

DROP POLICY IF EXISTS "members edit items" ON public.draft_items;

DROP POLICY IF EXISTS "draft items readable" ON public.draft_items;
CREATE POLICY "draft items readable" ON public.draft_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = draft_items.draft_id
      AND (
        d.owner_id = auth.uid()
        OR d.visibility = 'public'
        OR EXISTS (
          SELECT 1 FROM public.draft_members m
          WHERE m.draft_id = d.id AND m.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "draft items write if owner or public" ON public.draft_items;
CREATE POLICY "draft items write if owner or public" ON public.draft_items FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = draft_items.draft_id
      AND (d.owner_id = auth.uid() OR d.visibility = 'public')
  )
);

DROP POLICY IF EXISTS "draft items update if owner or public" ON public.draft_items;
CREATE POLICY "draft items update if owner or public" ON public.draft_items FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = draft_items.draft_id
      AND (d.owner_id = auth.uid() OR d.visibility = 'public')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = draft_items.draft_id
      AND (d.owner_id = auth.uid() OR d.visibility = 'public')
  )
);

DROP POLICY IF EXISTS "draft items delete if owner or public" ON public.draft_items;
CREATE POLICY "draft items delete if owner or public" ON public.draft_items FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = draft_items.draft_id
      AND (d.owner_id = auth.uid() OR d.visibility = 'public')
  )
);
