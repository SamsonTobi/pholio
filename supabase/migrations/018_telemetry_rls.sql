alter table public.raw_events enable row level security;
alter table public.daily_stats enable row level security;

-- Daily stats readable by public
create policy "Daily stats are readable by anyone"
on public.daily_stats
for select
using (true);

-- Raw events managed by service_role only (no anon insert policy; API route uses admin client)
create policy "Service role manages raw events"
on public.raw_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
