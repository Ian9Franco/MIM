-- Permitir que cualquiera lea los snapshots
CREATE POLICY "public snapshots readable" ON public.draft_snapshots FOR SELECT USING (true);

-- Permitir que los miembros del draft puedan insertar y crear nuevos snapshots
CREATE POLICY "members can create snapshots" ON public.draft_snapshots FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.draft_members WHERE draft_members.draft_id = draft_snapshots.draft_id AND draft_members.user_id = auth.uid())
);
