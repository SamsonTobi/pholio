-- 033: webhook delivery idempotency for github_sync_events
alter table public.github_sync_events
  add column if not exists delivery_id text unique;
create index if not exists idx_sync_events_delivery on public.github_sync_events(delivery_id);
