-- 039: broadcast project push-sync updates over the realtime fanout.
--
-- The GitHub webhook and manual resync paths update projects.last_push_at,
-- but no trigger existed on projects — so those changes never reached the
-- Cloudflare Worker and the dashboard could not live-update. Broadcast on
-- the owner's `showcase:<slug>` channel (same convention as the showcase /
-- daily_stats fanout) with a Worker-compatible payload ({type, id,
-- updated_at}). Fires only when last_push_at actually changes.

create or replace function public.trg_fn_projects_fanout()
returns trigger as $$
declare
  v_owner_slug text;
begin
  select slug into v_owner_slug
  from public.profiles
  where id = NEW.owner_id;

  if v_owner_slug is not null then
    perform public.notify_fanout(
      'showcase:' || v_owner_slug,
      'projects',
      NEW.id::text,
      jsonb_build_object(
        'type', 'project_updated',
        'id', NEW.id::text,
        'project_id', NEW.id,
        'last_push_at', NEW.last_push_at,
        'updated_at', now()
      )
    );
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_projects_fanout on public.projects;
create trigger trg_projects_fanout_update
after update of last_push_at on public.projects
for each row
when (old.last_push_at is distinct from new.last_push_at)
execute function public.trg_fn_projects_fanout();
