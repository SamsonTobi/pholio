create or replace function public.purge_realtime_outbox()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.realtime_outbox
  where created_at < now() - interval '7 days';
end;
$$;

-- Placeholder for pg_cron hourly outbox purge
-- In production on Supabase with pg_cron:
-- select cron.schedule('purge-realtime-outbox-hourly', '0 * * * *', 'select public.purge_realtime_outbox();');
