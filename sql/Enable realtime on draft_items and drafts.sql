-- Cross-client draft sync: postgres_changes on items and map layout
ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drafts;
