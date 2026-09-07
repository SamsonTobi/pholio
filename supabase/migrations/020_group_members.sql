create table if not exists public.hacker_group_members (
  group_id uuid references public.hacker_groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('owner', 'member')) default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create index if not exists idx_hacker_group_members_user on public.hacker_group_members(user_id);
