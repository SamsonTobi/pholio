create or replace function public.rollup_daily_stats()
returns void
language plpgsql
security definer
as $$
declare
  rec record;
  v_visitors int;
  v_actives_7d int;
  v_total int;
begin
  for rec in (
    select distinct date(r.ts) as day, p.id as project_id, r.telemetry_slug
    from public.raw_events r
    join public.projects p on p.telemetry_slug = r.telemetry_slug
    where r.ts >= now() - interval '30 days'
  ) loop
    -- Dedupe 5-minute buckets per session
    select count(distinct (session_hash || '-' || floor(extract(epoch from ts) / 300)::text))
    into v_visitors
    from public.raw_events
    where telemetry_slug = rec.telemetry_slug
    and date(ts) = rec.day;

    -- Active visitors rolling 7 days
    select count(distinct session_hash)
    into v_actives_7d
    from public.raw_events
    where telemetry_slug = rec.telemetry_slug
    and ts >= rec.day - interval '6 days'
    and ts < rec.day + interval '1 day';

    -- Total events on date
    select count(*)
    into v_total
    from public.raw_events
    where telemetry_slug = rec.telemetry_slug
    and date(ts) = rec.day;

    -- Upsert daily_stats
    insert into public.daily_stats (project_id, day, visitors, actives_7d, total)
    values (rec.project_id, rec.day, v_visitors, v_actives_7d, v_total)
    on conflict (project_id, day) do update
    set visitors = excluded.visitors,
        actives_7d = excluded.actives_7d,
        total = excluded.total;
  end loop;
end;
$$;

create or replace function public.purge_raw_events()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.raw_events
  where ts < now() - interval '30 days';
end;
$$;
