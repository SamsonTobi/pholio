create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('digest', 'spike', 'peer_push', 'invite')),
  payload jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
