-- 037: track first agent usage so the setup banner can retire on connect
alter table public.api_keys
  add column if not exists last_used_at timestamptz;
