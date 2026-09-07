create table if not exists public.hacker_groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  visibility text check (visibility in ('public', 'private')) default 'private',
  created_by uuid references public.profiles(id) on delete set null,
  slug_history text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_hacker_groups_slug on public.hacker_groups(slug);
