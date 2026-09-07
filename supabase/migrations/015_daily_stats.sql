create table if not exists public.daily_stats (
  project_id uuid references public.projects(id) on delete cascade not null,
  day date not null,
  visitors int default 0,
  actives_7d int default 0,
  total int default 0,
  primary key (project_id, day)
);

create index if not exists idx_daily_stats_project_day on public.daily_stats(project_id, day desc);
