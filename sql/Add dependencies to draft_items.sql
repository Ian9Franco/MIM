ALTER TABLE public.draft_items ADD COLUMN dependencies jsonb DEFAULT '[]'::jsonb;
