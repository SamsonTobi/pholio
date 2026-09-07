-- 034: fanout contract + trigger guards + rollup no-op suppression
--
-- Fixes from production-readiness review #2:
--  1. daily_stats + leaderboard fanout payloads carry `id` (the Worker DO
--     rejects broadcasts without it).
--  2. Fanout triggers fire only on real changes (WHEN guards + UPDATE OF),
--     so the 15-minute rollup no longer storms the Worker with unchanged rows.
--  3. rollup_daily_stats upsert skips no-op writes.
--  4. notify_fanout resolves pg_net in either `net` or `extensions` schema
--     (032 may relocate the extension) and skips dispatch when app_url is
--     unset instead of erroring nightly cron jobs.
--  5. Drop the redundant idx_sync_events_delivery (delivery_id unique btree
--     from 033 already covers it).

-- 1+2. daily_stats fanout: payload id + guarded trigger
create or replace function public.trg_fn_daily_stats_fanout()
returns trigger as $$
declare
  v_owner_slug text;
begin
  select p.slug into v_owner_slug
  from public.projects pr
  join public.profiles p on p.id = pr.owner_id
  where pr.id = NEW.project_id;

  if v_owner_slug is not null then
    perform public.notify_fanout(
      'showcase:' || v_owner_slug,
      'daily_stats',
      NEW.project_id::text,
      jsonb_build_object(
        'type', 'stats_updated',
        'id', NEW.project_id::text,
        'project_id', NEW.project_id,
        'day', NEW.day,
        'visitors', NEW.visitors,
        'actives_7d', NEW.actives_7d,
        'updated_at', now()
      )
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_daily_stats_fanout on public.daily_stats;
-- NOTE: WHEN (OLD.* ...) is illegal on INSERT (OLD is unavailable), so the
-- trigger is split: plain AFTER INSERT plus guarded AFTER UPDATE.
create trigger trg_daily_stats_fanout_insert
after insert on public.daily_stats
for each row
execute function public.trg_fn_daily_stats_fanout();
create trigger trg_daily_stats_fanout_update
after update of visitors, actives_7d, total on public.daily_stats
for each row
when (old.* is distinct from new.*)
execute function public.trg_fn_daily_stats_fanout();

-- 1+2. leaderboard fanout: payload id + guarded trigger
create or replace function public.trg_fn_leaderboard_fanout()
returns trigger as $$
begin
  perform public.notify_fanout(
    'hacker-group:' || NEW.group_id::text,
    'leaderboard_snapshots',
    NEW.group_id::text,
    jsonb_build_object(
      'type', 'leaderboard_updated',
      'id', NEW.group_id::text,
      'group_id', NEW.group_id,
      'day', NEW.day,
      'updated_at', now()
    )
  );
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_leaderboard_fanout on public.leaderboard_snapshots;
create trigger trg_leaderboard_fanout_insert
after insert on public.leaderboard_snapshots
for each row
execute function public.trg_fn_leaderboard_fanout();
create trigger trg_leaderboard_fanout_update
after update on public.leaderboard_snapshots
for each row
when (old.* is distinct from new.*)
execute function public.trg_fn_leaderboard_fanout();

-- 2. showcases fanout: inserts always broadcast; updates only when the
--    content columns change.
drop trigger if exists trg_showcases_fanout on public.showcases;
create trigger trg_showcases_fanout_insert
after insert on public.showcases
for each row
execute function public.trg_fn_showcases_fanout();
create trigger trg_showcases_fanout_update
after update of body, published_at, meta on public.showcases
for each row
when (old.* is distinct from new.*)
execute function public.trg_fn_showcases_fanout();

-- 3. rollup upsert: skip no-op writes so unchanged days don't re-fire fanout
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
    -- Unique visitors per day: distinct sessions (no time-bucket inflation)
    select count(distinct session_hash)
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

    -- Upsert daily_stats, skipping writes whose values are unchanged
    insert into public.daily_stats (project_id, day, visitors, actives_7d, total)
    values (rec.project_id, rec.day, v_visitors, v_actives_7d, v_total)
    on conflict (project_id, day) do update
    set visitors = excluded.visitors,
        actives_7d = excluded.actives_7d,
        total = excluded.total
    where (daily_stats.visitors, daily_stats.actives_7d, daily_stats.total)
      is distinct from (excluded.visitors, excluded.actives_7d, excluded.total);
  end loop;
end;
$$;

-- 4. notify_fanout: dynamic pg_net schema + unset app_url guard.
-- Keeps 032's fail-closed secret behavior.
create or replace function public.notify_fanout(
  p_channel text,
  p_table_name text,
  p_row_id text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_worker_url text;
  v_fanout_secret text;
  v_net_schema text;
  v_request_id bigint;
begin
  -- Insert into outbox first for durability and audit
  insert into public.realtime_outbox (table_name, row_id, channel, payload)
  values (p_table_name, p_row_id, p_channel, p_payload);

  -- Fetch worker settings (fail closed: never fall back to a dev secret)
  v_worker_url := nullif(current_setting('app.settings.realtime_worker_url', true), '');
  v_fanout_secret := nullif(current_setting('app.settings.fanout_secret', true), '');

  if v_fanout_secret is null then
    raise warning 'notify_fanout: app.settings.fanout_secret is not configured; outbox row kept, dispatch skipped (channel=%)', p_channel;
    return;
  end if;

  if v_worker_url is null then
    raise warning 'notify_fanout: app.settings.realtime_worker_url is not configured; outbox row kept, dispatch skipped (channel=%)', p_channel;
    return;
  end if;

  -- pg_net may live in `net` or `extensions` depending on host provisioning.
  -- Probe by function name + namespace (signatures vary by pg_net version).
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where p.proname = 'http_post' and n.nspname = 'net') then
    v_net_schema := 'net';
  elsif exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where p.proname = 'http_post' and n.nspname = 'extensions') then
    v_net_schema := 'extensions';
  else
    raise warning 'notify_fanout: pg_net http_post not found; outbox row kept, dispatch skipped (channel=%)', p_channel;
    return;
  end if;

  -- Dispatched via pg_net if configured. pg_net's http_post takes
  -- (url, body, params, headers, timeout); only url/body/headers are set.
  begin
    execute format('select %I.http_post($1, $2, $3, $4)', v_net_schema)
    into v_request_id
    using
      v_worker_url || '/fanout',
      jsonb_build_object(
        'channel', p_channel,
        'payload', p_payload
      ),
      '{}'::jsonb,
      jsonb_build_object(
        'Content-Type', 'application/json',
        'x-fanout-secret', v_fanout_secret
      );
  exception when others then
    -- Swallow network errors so main transaction never fails
    null;
  end;
end;
$$;

-- 5. delivery_id unique constraint already indexes the column; drop duplicate
drop index if exists public.idx_sync_events_delivery;
