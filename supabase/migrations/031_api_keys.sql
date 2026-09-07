create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text,
  prefix text not null unique,
  key_hash text not null,
  scopes text[] default '{showcase:write}',
  revoked_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_api_keys_user_id on public.api_keys(user_id);
create index if not exists idx_api_keys_prefix on public.api_keys(prefix);

alter table public.api_keys enable row level security;

create policy "Users can view their own API keys"
on public.api_keys
for select
using (auth.uid() = user_id);

create policy "Users can insert their own API keys"
on public.api_keys
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own API keys"
on public.api_keys
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own API keys"
on public.api_keys
for delete
using (auth.uid() = user_id);
