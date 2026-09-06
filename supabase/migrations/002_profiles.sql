create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  slug text unique not null,
  github_username text unique,
  github_id bigint,
  avatar_url text,
  display_name text,
  headline text default 'Product engineer',
  site_url text,
  template text default 'story' check (template in ('story', 'index')),
  slug_history text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_profiles_slug on public.profiles(slug);
create index if not exists idx_profiles_github_username on public.profiles(github_username);
