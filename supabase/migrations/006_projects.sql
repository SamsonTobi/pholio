create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade not null,
  github_repo_id bigint,
  github_full_name text,
  name text not null,
  showcase_slug text not null,
  description text,
  readme_summary text,
  icon_url text,
  tags text[] default '{}',
  language text,
  stars int default 0,
  live_url text,
  status text default 'active' check (status in ('active', 'archived')),
  last_push_at timestamptz,
  telemetry_slug text unique not null,
  created_at timestamptz default now(),
  unique(owner_id, github_repo_id)
);

create index if not exists idx_projects_owner_id on public.projects(owner_id);
create index if not exists idx_projects_telemetry_slug on public.projects(telemetry_slug);
create index if not exists idx_projects_last_push_at on public.projects(last_push_at desc);
