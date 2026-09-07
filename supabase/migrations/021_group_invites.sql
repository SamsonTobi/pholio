create table if not exists public.hacker_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.hacker_groups(id) on delete cascade not null,
  token text unique not null,
  github_username text,
  created_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  multi_use boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_hacker_group_invites_token on public.hacker_group_invites(token);
create index if not exists idx_hacker_group_invites_group on public.hacker_group_invites(group_id);
