alter table public.hacker_groups enable row level security;
alter table public.hacker_group_members enable row level security;
alter table public.hacker_group_invites enable row level security;
alter table public.leaderboard_snapshots enable row level security;
alter table public.notifications enable row level security;

-- Hacker Groups RLS
create policy "Public groups are readable by everyone"
on public.hacker_groups
for select
using (
  visibility = 'public'
  or auth.uid() = created_by
  or exists (
    select 1 from public.hacker_group_members
    where hacker_group_members.group_id = hacker_groups.id
    and hacker_group_members.user_id = auth.uid()
  )
);

create policy "Authenticated users can create groups"
on public.hacker_groups
for insert
with check (auth.role() = 'authenticated' and auth.uid() = created_by);

create policy "Owners can update their groups"
on public.hacker_groups
for update
using (
  auth.uid() = created_by
  or exists (
    select 1 from public.hacker_group_members
    where hacker_group_members.group_id = hacker_groups.id
    and hacker_group_members.user_id = auth.uid()
    and hacker_group_members.role = 'owner'
  )
);

create policy "Owners can delete their groups"
on public.hacker_groups
for delete
using (
  auth.uid() = created_by
  or exists (
    select 1 from public.hacker_group_members
    where hacker_group_members.group_id = hacker_groups.id
    and hacker_group_members.user_id = auth.uid()
    and hacker_group_members.role = 'owner'
  )
);

-- Members RLS
create policy "Members readable for public or member-accessible groups"
on public.hacker_group_members
for select
using (
  exists (
    select 1 from public.hacker_groups g
    where g.id = hacker_group_members.group_id
    and (
      g.visibility = 'public'
      or g.created_by = auth.uid()
      or exists (
        select 1 from public.hacker_group_members m
        where m.group_id = g.id
        and m.user_id = auth.uid()
      )
    )
  )
);

create policy "Group owners can insert members"
on public.hacker_group_members
for insert
with check (
  auth.role() = 'service_role'
  or auth.uid() = user_id
  or exists (
    select 1 from public.hacker_group_members m
    where m.group_id = hacker_group_members.group_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
  )
);

create policy "Members or owners can leave or remove members"
on public.hacker_group_members
for delete
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.hacker_group_members m
    where m.group_id = hacker_group_members.group_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
  )
);

-- Invites RLS
create policy "Invites readable by group owners or token query"
on public.hacker_group_invites
for select
using (
  auth.role() = 'service_role'
  or auth.role() = 'authenticated'
  or true
);

create policy "Group owners can create invites"
on public.hacker_group_invites
for insert
with check (
  auth.role() = 'service_role'
  or exists (
    select 1 from public.hacker_group_members m
    where m.group_id = hacker_group_invites.group_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
  )
);

-- Snapshots RLS
create policy "Snapshots readable by public or members"
on public.leaderboard_snapshots
for select
using (true);

create policy "Service role writes snapshots"
on public.leaderboard_snapshots
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Notifications RLS
create policy "Users read their own notifications"
on public.notifications
for select
using (auth.uid() = user_id);

create policy "Users update their own notifications"
on public.notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Service role writes notifications"
on public.notifications
for insert
with check (auth.role() = 'service_role');
