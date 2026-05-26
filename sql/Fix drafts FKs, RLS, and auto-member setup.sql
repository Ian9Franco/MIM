-- 1. Arreglamos las llaves foráneas para que apunten a profiles (permite los Joins del UI)
ALTER TABLE public.draft_items DROP CONSTRAINT IF EXISTS draft_items_added_by_fkey;
ALTER TABLE public.draft_items ADD CONSTRAINT draft_items_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id);

ALTER TABLE public.draft_members DROP CONSTRAINT IF EXISTS draft_members_user_id_fkey;
ALTER TABLE public.draft_members ADD CONSTRAINT draft_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.drafts DROP CONSTRAINT IF EXISTS drafts_owner_id_fkey;
ALTER TABLE public.drafts ADD CONSTRAINT drafts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.draft_snapshots DROP CONSTRAINT IF EXISTS draft_snapshots_created_by_fkey;
ALTER TABLE public.draft_snapshots ADD CONSTRAINT draft_snapshots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.draft_activity DROP CONSTRAINT IF EXISTS draft_activity_user_id_fkey;
ALTER TABLE public.draft_activity ADD CONSTRAINT draft_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 2. Arreglamos la política RLS para que también aplique correctamente en INSERTS
DROP POLICY IF EXISTS "members edit items" ON public.draft_items;
CREATE POLICY "members edit items" ON public.draft_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.draft_members WHERE draft_members.draft_id = draft_items.draft_id AND draft_members.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.draft_members WHERE draft_members.draft_id = draft_items.draft_id AND draft_members.user_id = auth.uid())
);

-- 3. Creamos el Trigger automático para que te añada como miembro al crear un Draft
CREATE OR REPLACE FUNCTION public.handle_new_draft()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.draft_members (draft_id, user_id, role)
  VALUES (new.id, new.owner_id, 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_draft_created ON public.drafts;
CREATE TRIGGER on_draft_created
  AFTER INSERT ON public.drafts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_draft();

-- 4. Te añadimos como miembro al draft que ya creaste (y quedó huérfano de miembros)
INSERT INTO public.draft_members (draft_id, user_id, role)
SELECT id, owner_id, 'owner' FROM public.drafts
WHERE NOT EXISTS (
  SELECT 1 FROM public.draft_members dm WHERE dm.draft_id = drafts.id AND dm.user_id = drafts.owner_id
);
