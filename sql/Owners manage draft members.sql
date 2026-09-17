-- Owners can invite and remove collaborators on their drafts.
CREATE POLICY "owners manage members" ON public.draft_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.drafts
    WHERE drafts.id = draft_members.draft_id
      AND drafts.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.drafts
    WHERE drafts.id = draft_members.draft_id
      AND drafts.owner_id = auth.uid()
  )
);
