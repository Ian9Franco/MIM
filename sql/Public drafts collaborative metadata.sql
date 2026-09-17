-- Signed-in users can update public drafts without changing them to private.

DROP POLICY IF EXISTS "public drafts collaborative update" ON public.drafts;
CREATE POLICY "public drafts collaborative update" ON public.drafts FOR UPDATE
USING (auth.role() = 'authenticated' AND visibility = 'public')
WITH CHECK (auth.role() = 'authenticated' AND visibility = 'public');
