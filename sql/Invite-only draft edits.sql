-- Public drafts stay readable. Writes need owner or invited editor.
-- Private drafts are hidden except from the owner and invited members.

CREATE OR REPLACE FUNCTION public.uid_is_draft_member(p_draft_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = p_draft_id AND d.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.draft_members m
    WHERE m.draft_id = p_draft_id AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.uid_can_edit_draft(p_draft_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = p_draft_id AND d.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.draft_members m
    WHERE m.draft_id = p_draft_id
      AND m.user_id = auth.uid()
      AND COALESCE(m.role, 'editor') IN ('owner', 'editor')
  );
$$;

REVOKE ALL ON FUNCTION public.uid_is_draft_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uid_can_edit_draft(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.uid_is_draft_member(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.uid_can_edit_draft(uuid) TO authenticated;

DROP POLICY IF EXISTS "authenticated read drafts" ON public.drafts;
DROP POLICY IF EXISTS "public drafts readable" ON public.drafts;
DROP POLICY IF EXISTS "public drafts collaborative update" ON public.drafts;
CREATE POLICY "drafts readable if public owner or member" ON public.drafts FOR SELECT
USING (
  visibility = 'public'
  OR owner_id = auth.uid()
  OR public.uid_is_draft_member(id)
);

DROP POLICY IF EXISTS "draft items readable" ON public.draft_items;
CREATE POLICY "draft items readable" ON public.draft_items FOR SELECT
USING (public.uid_is_draft_member(draft_id) OR EXISTS (
  SELECT 1 FROM public.drafts d
  WHERE d.id = draft_items.draft_id AND d.visibility = 'public'
));

DROP POLICY IF EXISTS "draft items write if owner or public" ON public.draft_items;
DROP POLICY IF EXISTS "draft items update if owner or public" ON public.draft_items;
DROP POLICY IF EXISTS "draft items delete if owner or public" ON public.draft_items;
DROP POLICY IF EXISTS "members edit items" ON public.draft_items;
CREATE POLICY "draft items write if invited editor" ON public.draft_items FOR ALL
USING (public.uid_can_edit_draft(draft_id))
WITH CHECK (public.uid_can_edit_draft(draft_id));

DROP POLICY IF EXISTS "members readable" ON public.draft_members;
DROP POLICY IF EXISTS "draft members readable" ON public.draft_members;
CREATE POLICY "draft members readable" ON public.draft_members FOR SELECT
USING (
  public.uid_is_draft_member(draft_id)
  OR EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = draft_members.draft_id AND d.visibility = 'public'
  )
);

DROP POLICY IF EXISTS "draft activity readable" ON public.draft_activity;
CREATE POLICY "draft activity readable" ON public.draft_activity FOR SELECT
USING (
  public.uid_is_draft_member(draft_id)
  OR EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = draft_activity.draft_id AND d.visibility = 'public'
  )
);

DROP POLICY IF EXISTS "snapshots_readable" ON public.draft_snapshots;
CREATE POLICY "snapshots_readable" ON public.draft_snapshots FOR SELECT
TO anon, authenticated
USING (
  public.uid_is_draft_member(draft_id)
  OR EXISTS (
    SELECT 1 FROM public.drafts d
    WHERE d.id = draft_snapshots.draft_id AND d.visibility = 'public'
  )
);
