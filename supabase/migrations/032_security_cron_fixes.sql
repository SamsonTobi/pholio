-- 032_security_cron_fixes.sql
-- F2 (RLS private-group leak) + F9 (crons/analytics/extensions/seed) + storage policies.
-- Runs once via `supabase db push`. Extension moves, cron setup, and the
-- unique-constraint add are guarded (notice/warn + skip when not applicable).

-- ============================================================================
-- 1. Extensions live in the `extensions` schema (guarded; no-op if already so)
-- ============================================================================
create schema if not exists extensions;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pgcrypto') then
    begin
      alter extension "pgcrypto" set schema extensions;
    exception when others then
      raise notice '032: pgcrypto schema move skipped (%)', sqlerrm;
    end;
  else
    create extension if not exists "pgcrypto" with schema extensions;
  end if;

  if exists (select 1 from pg_extension where extname = 'pg_net') then
    begin
      alter extension "pg_net" set schema extensions;
    exception when others then
      raise notice '032: pg_net schema move skipped (%)', sqlerrm;
    end;
  else
    begin
      create extension if not exists "pg_net" with schema extensions;
    exception when others then
      raise notice '032: pg_net install skipped (%)', sqlerrm;
    end;
  end if;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      alter extension "pg_cron" set schema extensions;
    exception when others then
      raise notice '032: pg_cron schema move skipped (%)', sqlerrm;
    end;
  else
    begin
      create extension if not exists "pg_cron" with schema extensions;
    exception when others then
      raise notice '032: pg_cron install skipped (%)', sqlerrm;
    end;
  end if;

  begin
    grant usage on schema extensions to anon, authenticated, service_role;
  exception when others then
    raise notice '032: extensions usage grant skipped (%)', sqlerrm;
  end;
end $$;

-- ============================================================================
-- 2a. RLS helper functions (SECURITY DEFINER, auth.uid()-bound).
--     The 024 policies check membership with inline EXISTS subqueries against
--     hacker_group_members / hacker_groups, whose own SELECT policies do the
--     same in return. Postgres aborts that mutual reference with
--     "infinite recursion detected in policy" for EVERY anon/authenticated
--     read (verified: even `select from hacker_groups` errors). These
--     helpers run as the table owner (bypass RLS) so membership checks
--     terminate. They only ever disclose information about the caller
--     (auth.uid()), never about other users, so PUBLIC execute is safe.
-- ============================================================================
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.hacker_group_members m
    where m.group_id = p_group_id
    and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.hacker_group_members m
    where m.group_id = p_group_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
  );
$$;

create or replace function public.is_group_creator(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.hacker_groups g
    where g.id = p_group_id
    and g.created_by = auth.uid()
  );
$$;

create or replace function public.is_group_visible(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.hacker_groups g
    where g.id = p_group_id
    and (
      g.visibility = 'public'
      or g.created_by = auth.uid()
      or exists (
        select 1 from public.hacker_group_members m
        where m.group_id = g.id
        and m.user_id = auth.uid()
      )
    )
  );
$$;

-- ============================================================================
-- 2b. Rewrite the recursive 024 group/member policies (same names, same
--     semantics) to use the helpers above so reads terminate.
-- ============================================================================
drop policy if exists "Public groups are readable by everyone" on public.hacker_groups;
create policy "Public groups are readable by everyone"
on public.hacker_groups
for select
using (
  visibility = 'public'
  or auth.uid() = created_by
  or public.is_group_member(hacker_groups.id)
);

drop policy if exists "Owners can update their groups" on public.hacker_groups;
create policy "Owners can update their groups"
on public.hacker_groups
for update
using (
  auth.uid() = created_by
  or public.is_group_owner(hacker_groups.id)
);

drop policy if exists "Owners can delete their groups" on public.hacker_groups;
create policy "Owners can delete their groups"
on public.hacker_groups
for delete
using (
  auth.uid() = created_by
  or public.is_group_owner(hacker_groups.id)
);

drop policy if exists "Members readable for public or member-accessible groups"
on public.hacker_group_members;
create policy "Members readable for public or member-accessible groups"
on public.hacker_group_members
for select
using (public.is_group_visible(hacker_group_members.group_id));

drop policy if exists "Members or owners can leave or remove members"
on public.hacker_group_members;
create policy "Members or owners can leave or remove members"
on public.hacker_group_members
for delete
using (
  auth.uid() = user_id
  or public.is_group_owner(hacker_group_members.group_id)
);

drop policy if exists "Group owners can create invites" on public.hacker_group_invites;
create policy "Group owners can create invites"
on public.hacker_group_invites
for insert
with check (
  auth.role() = 'service_role'
  or public.is_group_owner(hacker_group_invites.group_id)
);

-- ============================================================================
-- 2c. realtime_outbox: enable RLS, service_role only
--    (SECURITY DEFINER fns notify_fanout / fanout triggers run as the table
--    owner and bypass RLS, so dispatch keeps working.)
-- ============================================================================
alter table public.realtime_outbox enable row level security;

drop policy if exists "Service role only" on public.realtime_outbox;
create policy "Service role only"
on public.realtime_outbox
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- ============================================================================
-- 3. Hacker invites: drop `OR true` full-table read; owner read + member read
-- ============================================================================
drop policy if exists "Invites readable by group owners or token query"
on public.hacker_group_invites;

create policy "Group owners can read invites"
on public.hacker_group_invites
for select
using (
  auth.role() = 'service_role'
  or public.is_group_owner(hacker_group_invites.group_id)
  or public.is_group_creator(hacker_group_invites.group_id)
);

create policy "Group members can read invites"
on public.hacker_group_invites
for select
using (public.is_group_member(hacker_group_invites.group_id));

-- Invite write policies for owners (previously missing -> implicit deny)
drop policy if exists "Group owners can update invites" on public.hacker_group_invites;
create policy "Group owners can update invites"
on public.hacker_group_invites
for update
using (
  auth.role() = 'service_role'
  or public.is_group_owner(hacker_group_invites.group_id)
)
with check (
  auth.role() = 'service_role'
  or public.is_group_owner(hacker_group_invites.group_id)
);

drop policy if exists "Group owners can delete invites" on public.hacker_group_invites;
create policy "Group owners can delete invites"
on public.hacker_group_invites
for delete
using (
  auth.role() = 'service_role'
  or public.is_group_owner(hacker_group_invites.group_id)
);

-- ============================================================================
-- 4. Members insert: remove auth.uid() = user_id self-insert branch.
--    Only service_role (join flow uses admin client after token validation)
--    or an existing group owner may insert.
-- ============================================================================
drop policy if exists "Group owners can insert members" on public.hacker_group_members;
create policy "Group owners can insert members"
on public.hacker_group_members
for insert
with check (
  auth.role() = 'service_role'
  or public.is_group_owner(hacker_group_members.group_id)
);

-- ============================================================================
-- 5. leaderboard_snapshots: scope select to public-or-member (was `true`)
-- ============================================================================
drop policy if exists "Snapshots readable by public or members"
on public.leaderboard_snapshots;

create policy "Snapshots readable for public or member-accessible groups"
on public.leaderboard_snapshots
for select
using (public.is_group_visible(leaderboard_snapshots.group_id));

-- ============================================================================
-- 6. github_sync_events: owner-only + service_role (was `true`)
-- ============================================================================
drop policy if exists "Public sync events readable" on public.github_sync_events;
create policy "Owners and service role can read sync events"
on public.github_sync_events
for select
using (
  auth.role() = 'service_role'
  or auth.uid() = owner_id
);

drop policy if exists "Owners insert sync events" on public.github_sync_events;
create policy "Owners and service role insert sync events"
on public.github_sync_events
for insert
with check (
  auth.role() = 'service_role'
  or auth.uid() = owner_id
);

-- ============================================================================
-- 7. showcases / mockups: keep public read in V1 (no is_draft column exists
--    per 010_showcases.sql / 011_mockups.sql, so everything published is
--    public by design). Comment records that a future is_draft column must
--    gate these policies.
-- ============================================================================
comment on policy "Public showcases are readable" on public.showcases is
'V1: all showcases including drafts are public by design (no is_draft column). Gate this policy on is_draft when the column lands.';
comment on policy "Public mockups are readable" on public.mockups is
'V1: all mockups including drafts are public by design (no is_draft column). Gate this policy on is_draft when the column lands.';

-- ============================================================================
-- 8. Storage: logos update/delete + mockups update WITH CHECK mirroring USING
--    (first path segment must equal auth.uid())
-- ============================================================================
drop policy if exists "Authenticated users can update their logos" on storage.objects;
create policy "Authenticated users can update their logos"
on storage.objects for update
using (
  bucket_id = 'logos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'logos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authenticated users can delete their logos" on storage.objects;
create policy "Authenticated users can delete their logos"
on storage.objects for delete
using (
  bucket_id = 'logos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authenticated users can update their mockups" on storage.objects;
create policy "Authenticated users can update their mockups"
on storage.objects for update
using (
  bucket_id = 'mockups'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'mockups'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 9. projects: unique(owner_id, showcase_slug) if missing (guarded against
--    pre-existing duplicates: warns and skips instead of failing the push)
-- ============================================================================
do $$
declare
  v_dupes int;
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'projects_owner_showcase_slug_key'
    and conrelid = 'public.projects'::regclass
  ) then
    raise notice '032: unique(owner_id, showcase_slug) already exists, skipping';
    return;
  end if;

  select count(*) into v_dupes from (
    select owner_id, showcase_slug
    from public.projects
    group by owner_id, showcase_slug
    having count(*) > 1
  ) d;

  if v_dupes > 0 then
    raise warning '032: % duplicate (owner_id, showcase_slug) groups found; unique constraint NOT added — dedupe manually then re-apply', v_dupes;
  else
    alter table public.projects
      add constraint projects_owner_showcase_slug_key unique (owner_id, showcase_slug);
  end if;
end $$;

-- ============================================================================
-- 10. Analytics index + rollup fix: visitors = count(distinct session_hash)
--     per day (was 5-minute session-bucket dedupe, which inflated visitors)
-- ============================================================================
create index if not exists idx_raw_events_ts on public.raw_events(ts);

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

-- ============================================================================
-- 11. notify_fanout: no 'dev-secret' default; abort dispatch (after the
--     durable outbox insert) with a warning when the secret is not configured
-- ============================================================================
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
begin
  -- Insert into outbox first for durability and audit
  insert into public.realtime_outbox (table_name, row_id, channel, payload)
  values (p_table_name, p_row_id, p_channel, p_payload);

  -- Fetch worker settings (fail closed: never fall back to a dev secret)
  v_worker_url := current_setting('app.settings.realtime_worker_url', true);
  v_fanout_secret := current_setting('app.settings.fanout_secret', true);

  if v_fanout_secret is null or v_fanout_secret = '' then
    raise warning 'notify_fanout: app.settings.fanout_secret is not configured; outbox row kept, dispatch skipped (channel=%)', p_channel;
    return;
  end if;

  -- Dispatched via pg_net if configured
  if v_worker_url is not null and v_worker_url != '' then
    begin
      perform net.http_post(
        url := v_worker_url || '/fanout',
        body := jsonb_build_object(
          'channel', p_channel,
          'payload', p_payload
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-fanout-secret', v_fanout_secret
        )
      );
    exception when others then
      -- Swallow network errors so main transaction never fails
      null;
    end;
  end if;
end;
$$;

-- ============================================================================
-- 12. Real cron schedules (unschedule-if-exists, idempotent).
--     Resolves the pg_cron / pg_net schema dynamically (prefers `cron` /
--     `net`, falls back to `extensions`) so the calls stay schema-qualified
--     wherever the extensions were installed. Secrets are read at run time
--     from settings — never hardcoded here.
--     Required settings (set via `alter database ... set` / vault / dashboard):
--       app.settings.app_url, app.settings.cron_secret,
--       app.settings.realtime_worker_url, app.settings.fanout_secret
-- ============================================================================
do $$
declare
  v_cron text;
  v_net text;
  v_has_http boolean := false;
  v_leaderboard_cmd text;
  v_resync_cmd text;
begin
  if to_regprocedure('cron.schedule(text,text,text)') is not null then
    v_cron := 'cron';
  elsif to_regprocedure('extensions.schedule(text,text,text)') is not null then
    v_cron := 'extensions';
  else
    raise notice '032: pg_cron schedule() not found; skipping cron job setup';
    return;
  end if;

  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'http_post' and n.nspname = 'net'
  ) then
    v_net := 'net';
    v_has_http := true;
  elsif exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'http_post' and n.nspname = 'extensions'
  ) then
    v_net := 'extensions';
    v_has_http := true;
  else
    raise notice '032: pg_net http_post() not found; HTTP cron jobs (leaderboard, github-resync) will be skipped';
  end if;

  -- Drop legacy placeholder names from earlier stub migrations, if any exist
  begin
    execute format('select %I.unschedule(jobid) from %I.job where jobname = any(%L)', v_cron, v_cron,
      array['compute-leaderboard-daily', 'daily-github-resync', 'purge-realtime-outbox-hourly']);
  exception when others then
    raise notice '032: legacy cron unschedule skipped (%)', sqlerrm;
  end;

  -- rollup-15min: telemetry rollup every 15 minutes
  begin
    execute format('select %I.unschedule(jobid) from %I.job where jobname = %L', v_cron, v_cron, 'rollup-15min');
    execute format('select %I.schedule(%L, %L, %L)', v_cron,
      'rollup-15min', '*/15 * * * *', 'select public.rollup_daily_stats();');
  exception when others then
    raise warning '032: rollup-15min schedule failed (%)', sqlerrm;
  end;

  -- purge-raw-daily: raw events retention cleanup
  begin
    execute format('select %I.unschedule(jobid) from %I.job where jobname = %L', v_cron, v_cron, 'purge-raw-daily');
    execute format('select %I.schedule(%L, %L, %L)', v_cron,
      'purge-raw-daily', '0 3 * * *', 'select public.purge_raw_events();');
  exception when others then
    raise warning '032: purge-raw-daily schedule failed (%)', sqlerrm;
  end;

  -- outbox-purge-hourly: realtime outbox retention cleanup
  begin
    execute format('select %I.unschedule(jobid) from %I.job where jobname = %L', v_cron, v_cron, 'outbox-purge-hourly');
    execute format('select %I.schedule(%L, %L, %L)', v_cron,
      'outbox-purge-hourly', '0 * * * *', 'select public.purge_realtime_outbox();');
  exception when others then
    raise warning '032: outbox-purge-hourly schedule failed (%)', sqlerrm;
  end;

  -- HTTP jobs need pg_net at run time; secrets come from settings, not literals.
  -- Both commands no-op with a notice when app_url/cron_secret are unset.
  if v_has_http then
    v_leaderboard_cmd :=
      'do $$ begin if nullif(current_setting(''app.settings.app_url'', true), '''') is null then ' ||
      'raise notice ''leaderboard-daily: app.settings.app_url unset, skipping''; return; end if; ' ||
      'perform ' || quote_ident(v_net) || '.http_post(' ||
      'url := current_setting(''app.settings.app_url'', true) || ''/api/cron/leaderboard'', ' ||
      'headers := jsonb_build_object(''Content-Type'', ''application/json'', ' ||
      '''Authorization'', ''Bearer '' || current_setting(''app.settings.cron_secret'', true))); end $$;';

    begin
      execute format('select %I.unschedule(jobid) from %I.job where jobname = %L', v_cron, v_cron, 'leaderboard-daily');
      execute format('select %I.schedule(%L, %L, %L)', v_cron,
        'leaderboard-daily', '0 2 * * *', v_leaderboard_cmd);
    exception when others then
      raise warning '032: leaderboard-daily schedule failed (%)', sqlerrm;
    end;

    v_resync_cmd :=
      'do $$ begin if nullif(current_setting(''app.settings.app_url'', true), '''') is null then ' ||
      'raise notice ''github-resync-daily: app.settings.app_url unset, skipping''; return; end if; ' ||
      'perform ' || quote_ident(v_net) || '.http_post(' ||
      'url := current_setting(''app.settings.app_url'', true) || ''/api/cron/resync'', ' ||
      'headers := jsonb_build_object(''Content-Type'', ''application/json'', ' ||
      '''Authorization'', ''Bearer '' || current_setting(''app.settings.cron_secret'', true))); end $$;';

    begin
      execute format('select %I.unschedule(jobid) from %I.job where jobname = %L', v_cron, v_cron, 'github-resync-daily');
      execute format('select %I.schedule(%L, %L, %L)', v_cron,
        'github-resync-daily', '0 4 * * *', v_resync_cmd);
    exception when others then
      raise warning '032: github-resync-daily schedule failed (%)', sqlerrm;
    end;
  end if;
end $$;
