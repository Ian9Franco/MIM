-- Authenticated users can view every draft. Collaboration stays owner-or-public.

DROP POLICY IF EXISTS "authenticated read drafts" ON public.drafts;
CREATE POLICY "authenticated read drafts" ON public.drafts FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "members readable" ON public.draft_members;
CREATE POLICY "draft members readable" ON public.draft_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = draft_members.draft_id
      AND (
        d.owner_id = auth.uid()
        OR d.visibility = 'public'
        OR auth.role() = 'authenticated'
      )
  )
);

DROP POLICY IF EXISTS "draft activity readable" ON public.draft_activity;
CREATE POLICY "draft activity readable" ON public.draft_activity FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = draft_activity.draft_id
      AND (
        d.owner_id = auth.uid()
        OR d.visibility = 'public'
        OR auth.role() = 'authenticated'
      )
  )
);

DROP POLICY IF EXISTS "draft items readable" ON public.draft_items;
CREATE POLICY "draft items readable" ON public.draft_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = draft_items.draft_id
      AND (
        d.owner_id = auth.uid()
        OR d.visibility = 'public'
        OR auth.role() = 'authenticated'
      )
  )
);
