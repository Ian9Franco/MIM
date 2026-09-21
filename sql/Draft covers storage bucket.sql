-- Draft cover uploads: public bucket + editor-gated object policies
-- Applied to MIM (kpdznwxhufdtvfipwwqf) as migration draft_covers_storage_bucket

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'draft-covers',
  'draft-covers',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read draft covers" ON storage.objects;
CREATE POLICY "Public read draft covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'draft-covers');

DROP POLICY IF EXISTS "Editors upload draft covers" ON storage.objects;
CREATE POLICY "Editors upload draft covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'draft-covers'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.uid_can_edit_draft(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Editors update draft covers" ON storage.objects;
CREATE POLICY "Editors update draft covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'draft-covers'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.uid_can_edit_draft(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'draft-covers'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.uid_can_edit_draft(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Editors delete draft covers" ON storage.objects;
CREATE POLICY "Editors delete draft covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'draft-covers'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND public.uid_can_edit_draft(((storage.foldername(name))[1])::uuid)
);
