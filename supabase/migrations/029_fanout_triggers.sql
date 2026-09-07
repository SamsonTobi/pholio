create or replace function public.trg_fn_showcases_fanout()
returns trigger as $$
declare
  v_owner_slug text;
  v_group_rec record;
begin
  select slug into v_owner_slug
  from public.profiles
  where id = NEW.owner_id;

  if v_owner_slug is not null then
    perform public.notify_fanout(
      'showcase:' || v_owner_slug,
      'showcases',
      NEW.id::text,
      jsonb_build_object(
        'type', 'showcase_published',
        'id', NEW.id,
        'project_id', NEW.project_id,
        'updated_at', NEW.published_at
      )
    );
  end if;

  -- Notify hacker groups this owner belongs to
  for v_group_rec in (
    select group_id
    from public.hacker_group_members
    where user_id = NEW.owner_id
  ) loop
    perform public.notify_fanout(
      'hacker-group:' || v_group_rec.group_id::text,
      'showcases',
      NEW.id::text,
      jsonb_build_object(
        'type', 'peer_showcase',
        'group_id', v_group_rec.group_id,
        'user_id', NEW.owner_id,
        'id', NEW.id,
        'updated_at', NEW.published_at
      )
    );
  end loop;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_showcases_fanout on public.showcases;
create trigger trg_showcases_fanout
after insert or update on public.showcases
for each row
execute function public.trg_fn_showcases_fanout();

-- Daily stats fanout
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
create trigger trg_daily_stats_fanout
after insert or update on public.daily_stats
for each row
execute function public.trg_fn_daily_stats_fanout();

-- Leaderboard snapshots fanout
create or replace function public.trg_fn_leaderboard_fanout()
returns trigger as $$
begin
  perform public.notify_fanout(
    'hacker-group:' || NEW.group_id::text,
    'leaderboard_snapshots',
    NEW.group_id::text,
    jsonb_build_object(
      'type', 'leaderboard_updated',
      'group_id', NEW.group_id,
      'day', NEW.day,
      'updated_at', now()
    )
  );
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_leaderboard_fanout on public.leaderboard_snapshots;
create trigger trg_leaderboard_fanout
after insert or update on public.leaderboard_snapshots
for each row
execute function public.trg_fn_leaderboard_fanout();
