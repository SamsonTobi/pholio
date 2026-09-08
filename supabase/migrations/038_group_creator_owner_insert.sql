-- 038_group_creator_owner_insert.sql
-- Fix group creation: allow the group creator to self-insert as owner.
-- 032 removed the `auth.uid() = user_id` self-insert branch to block arbitrary
-- self-joins to private groups, but that also blocked the legitimate
-- create-group flow (insert group -> insert self as owner), since the creator
-- is not yet an owner at insert time. This restores a scoped exception:
-- a user may insert THEMSELVES iff they are the group's creator
-- (is_group_creator checks hacker_groups.created_by = auth.uid()).
-- Arbitrary self-joins to other users' groups remain denied.

drop policy if exists "Group owners can insert members" on public.hacker_group_members;

create policy "Group owners can insert members"
on public.hacker_group_members
for insert
with check (
  auth.role() = 'service_role'
  or public.is_group_owner(hacker_group_members.group_id)
  or (
    auth.uid() = hacker_group_members.user_id
    and public.is_group_creator(hacker_group_members.group_id)
  )
);
