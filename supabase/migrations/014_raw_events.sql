create table if not exists public.raw_events (
  id bigint generated always as identity primary key,
  telemetry_slug text not null,
  session_hash text not null,
  path text,
  ts timestamptz default now()
);

create index if not exists idx_raw_events_slug_ts on public.raw_events(telemetry_slug, ts desc);
create index if not exists idx_raw_events_slug_sess_ts on public.raw_events(telemetry_slug, session_hash, ts);
