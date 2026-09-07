create table if not exists public.mockups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  storage_path text not null,
  device text not null check (device in ('browser', 'phone', 'tablet')),
  sort int default 0
);

create index if not exists idx_mockups_project_sort on public.mockups(project_id, sort);
