-- Invited editors can update draft metadata; activity inserts use user_id.
-- Invite-only previously dropped "public drafts collaborative update" without a replacement,
-- so non-owners could not persist title/cover/description changes.

DROP POLICY IF EXISTS "public drafts collaborative update" ON public.drafts;
DROP POLICY IF EXISTS "editors update drafts" ON public.drafts;
CREATE POLICY "editors update drafts" ON public.drafts
FOR UPDATE
USING (public.uid_can_edit_draft(id))
WITH CHECK (public.uid_can_edit_draft(id));

DROP POLICY IF EXISTS "editors insert draft activity" ON public.draft_activity;
CREATE POLICY "editors insert draft activity" ON public.draft_activity
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.uid_can_edit_draft(draft_id)
);

-- Non-owners may change title/cover/description, but not ownership/visibility/version/loader.
CREATE OR REPLACE FUNCTION public.enforce_draft_metadata_edit_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'No se puede cambiar el dueño del draft';
  END IF;

  IF auth.uid() IS DISTINCT FROM OLD.owner_id THEN
    IF NEW.visibility IS DISTINCT FROM OLD.visibility THEN
      RAISE EXCEPTION 'Solo el dueño puede cambiar la visibilidad';
    END IF;
    IF NEW.minecraft_version IS DISTINCT FROM OLD.minecraft_version
       OR NEW.loader IS DISTINCT FROM OLD.loader THEN
      RAISE EXCEPTION 'Solo el dueño puede cambiar versión o loader';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_draft_metadata_edit_limits ON public.drafts;
CREATE TRIGGER trg_enforce_draft_metadata_edit_limits
  BEFORE UPDATE ON public.drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_draft_metadata_edit_limits();
