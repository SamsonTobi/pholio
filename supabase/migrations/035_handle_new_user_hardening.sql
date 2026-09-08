-- 035: harden handle_new_user (provider_id cast, slug shape, race retry)
--
--  - provider_id may be missing/non-numeric: never abort signup on the cast.
--  - Collapse repeated dashes and cap the base slug at 30 chars to match the
--    app-side zod rule (slug /^[a-z0-9-]{3,30}$/).
--  - Retry the insert with an incremented suffix on unique_violation so two
--    concurrent signups for the same handle don't kill either account.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_username text;
  clean_slug text;
  base_slug text;
  final_slug text;
  suffix int := 0;
  v_provider_id bigint := null;
  v_github_username text;
begin
  raw_username := coalesce(
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'preferred_username',
    split_part(NEW.email, '@', 1),
    'builder'
  );

  clean_slug := lower(regexp_replace(raw_username, '[^a-zA-Z0-9-]+', '-', 'g'));
  clean_slug := regexp_replace(clean_slug, '-{2,}', '-', 'g');
  clean_slug := trim(both '-' from clean_slug);
  if clean_slug = '' then
    clean_slug := 'builder';
  end if;
  if length(clean_slug) < 3 then
    clean_slug := clean_slug || '-user';
  end if;
  base_slug := substring(clean_slug from 1 for 30);

  begin
    v_provider_id := nullif(NEW.raw_user_meta_data->>'provider_id', '')::bigint;
  exception when others then
    v_provider_id := null;
  end;

  v_github_username := NEW.raw_user_meta_data->>'user_name';

  <<slug_loop>>
  loop
    if suffix = 0 then
      final_slug := base_slug;
    else
      final_slug := substring(base_slug from 1 for 24) || '-' || suffix;
    end if;

    begin
      insert into public.profiles (
        id,
        slug,
        github_username,
        github_id,
        avatar_url,
        display_name,
        headline
      ) values (
        NEW.id,
        final_slug,
        v_github_username,
        v_provider_id,
        NEW.raw_user_meta_data->>'avatar_url',
        coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', raw_username),
        'Product engineer'
      );
      exit slug_loop;
    exception when unique_violation then
      suffix := suffix + 1;
      if suffix > 100 then
        raise warning 'handle_new_user: could not allocate slug for user %', NEW.id;
        return NEW;
      end if;
    end;
  end loop slug_loop;

  return NEW;
end;
$$ language plpgsql security definer
set search_path = public;
