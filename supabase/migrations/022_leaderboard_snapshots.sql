create table if not exists public.leaderboard_snapshots (
  group_id uuid references public.hacker_groups(id) on delete cascade not null,
  day date not null,
  rankings jsonb not null default '[]'::jsonb,
  primary key (group_id, day)
);

create index if not exists idx_leaderboard_snapshots_group_day on public.leaderboard_snapshots(group_id, day desc);
