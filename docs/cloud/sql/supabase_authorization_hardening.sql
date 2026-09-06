-- MIM Supabase authorization hardening
--
-- Scope:
--   1. Remove the unconditional draft_snapshots read policy.
--   2. Collapse duplicate snapshot policies into one policy per action.
--   3. Restrict table privileges to the operations the client actually needs.
--   4. Keep audit attribution honest on snapshot creation.
--   5. Prevent direct RPC execution of trigger-only SECURITY DEFINER functions.
--   6. Pin SECURITY DEFINER search_path to remove mutable search-path risk.
--
-- This script was validated against the current MIM Supabase schema inside an
-- explicit transaction with ROLLBACK before being committed. It is intentionally
-- not auto-applied by this repository.

begin;

-- draft_snapshots currently inherits broad table grants and duplicated permissive
-- policies. RLS remains enabled; these grants narrow the reachable operations.
revoke all privileges on table public.draft_snapshots from anon, authenticated;
grant select on table public.draft_snapshots to anon;
grant select, insert, delete on table public.draft_snapshots to authenticated;

-- Remove both the unsafe unconditional reader and historical duplicates.
drop policy if exists "public snapshots readable" on public.draft_snapshots;
drop policy if exists "snapshots_readable" on public.draft_snapshots;
drop policy if exists "members can create snapshots" on public.draft_snapshots;
drop policy if exists "members_create_snapshots" on public.draft_snapshots;
drop policy if exists "Users can delete snapshots of their own drafts" on public.draft_snapshots;
drop policy if exists "owners_delete_snapshots" on public.draft_snapshots;

-- Anonymous users may read snapshots only for public drafts. Authenticated owners
-- may also read their own draft snapshots.
create policy "snapshots_readable"
on public.draft_snapshots
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.drafts d
    where d.id = draft_snapshots.draft_id
      and (
        d.visibility = 'public'
        or d.owner_id = (select auth.uid())
      )
  )
);

-- Members may create snapshots, but cannot attribute them to another account.
create policy "members_create_snapshots"
on public.draft_snapshots
for insert
to authenticated
with check (
  draft_snapshots.created_by = (select auth.uid())
  and exists (
    select 1
    from public.draft_members dm
    where dm.draft_id = draft_snapshots.draft_id
      and dm.user_id = (select auth.uid())
  )
);

-- Preserve the existing product rule: only the draft owner deletes snapshots.
create policy "owners_delete_snapshots"
on public.draft_snapshots
for delete
to authenticated
using (
  exists (
    select 1
    from public.drafts d
    where d.id = draft_snapshots.draft_id
      and d.owner_id = (select auth.uid())
  )
);

-- These functions are trigger infrastructure, not public RPC endpoints. Their
-- current bodies fully qualify application objects, so an empty search_path is
-- safe while pg_catalog built-ins remain available.
alter function public.handle_new_user() set search_path = '';
alter function public.handle_new_draft() set search_path = '';
alter function public.refresh_community_rankings() set search_path = '';

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_draft() from public, anon, authenticated;
revoke execute on function public.refresh_community_rankings() from public, anon, authenticated;

commit;
