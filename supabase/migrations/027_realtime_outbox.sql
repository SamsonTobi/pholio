create table if not exists public.realtime_outbox (
  id bigint generated always as identity primary key,
  table_name text,
  row_id text,
  channel text not null,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_realtime_outbox_channel_created on public.realtime_outbox(channel, created_at desc);
