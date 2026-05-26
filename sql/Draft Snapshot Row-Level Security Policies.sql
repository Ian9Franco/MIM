
DROP POLICY IF EXISTS "snapshots_readable" ON public.draft_snapshots;
CREATE POLICY "snapshots_readable" ON public.draft_snapshots FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.drafts WHERE drafts.id = draft_snapshots.draft_id AND (visibility = 'public' OR owner_id = auth.uid()))
);

DROP POLICY IF EXISTS "members_create_snapshots" ON public.draft_snapshots;
CREATE POLICY "members_create_snapshots" ON public.draft_snapshots FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.draft_members WHERE draft_members.draft_id = draft_snapshots.draft_id AND draft_members.user_id = auth.uid())
);

DROP POLICY IF EXISTS "owners_delete_snapshots" ON public.draft_snapshots;
CREATE POLICY "owners_delete_snapshots" ON public.draft_snapshots FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.drafts WHERE drafts.id = draft_snapshots.draft_id AND drafts.owner_id = auth.uid())
);
