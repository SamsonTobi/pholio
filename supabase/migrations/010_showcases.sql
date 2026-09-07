create table if not exists public.showcases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  body text not null check (char_length(body) between 10 and 600),
  meta jsonb default '{}'::jsonb,
  published_at timestamptz default now(),
  source text not null check (source in ('github', 'agent', 'manual'))
);

create index if not exists idx_showcases_project_published on public.showcases(project_id, published_at desc);
create index if not exists idx_showcases_owner_published on public.showcases(owner_id, published_at desc);
