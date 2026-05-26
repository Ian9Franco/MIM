-- Permitir a los usuarios eliminar snapshots si son los dueños del draft
CREATE POLICY "Users can delete snapshots of their own drafts" 
ON draft_snapshots
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM drafts 
    WHERE drafts.id = draft_snapshots.draft_id 
    AND drafts.owner_id = auth.uid()
  )
);
