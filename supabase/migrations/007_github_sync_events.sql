create table if not exists public.github_sync_events (
  id bigint generated always as identity primary key,
  project_id uuid references public.projects(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  event_type text check (event_type in ('push', 'release', 'manual', 'cron', 'import')),
  pushed_at timestamptz default now(),
  commit_sha text,
  created_at timestamptz default now()
);

create index if not exists idx_sync_events_project on public.github_sync_events(project_id, pushed_at desc);
create index if not exists idx_sync_events_owner on public.github_sync_events(owner_id, pushed_at desc);
