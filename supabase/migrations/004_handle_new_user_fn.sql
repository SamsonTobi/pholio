create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_username text;
  clean_slug text;
  final_slug text;
  suffix int := 1;
begin
  raw_username := coalesce(
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'preferred_username',
    split_part(NEW.email, '@', 1),
    'builder'
  );

  clean_slug := lower(regexp_replace(raw_username, '[^a-zA-Z0-9-]', '-', 'g'));
  clean_slug := trim(both '-' from clean_slug);
  if length(clean_slug) < 3 then
    clean_slug := clean_slug || '-user';
  end if;

  final_slug := clean_slug;
  while exists(select 1 from public.profiles where slug = final_slug) loop
    final_slug := clean_slug || '-' || suffix;
    suffix := suffix + 1;
  end loop;

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
    NEW.raw_user_meta_data->>'user_name',
    (NEW.raw_user_meta_data->>'provider_id')::bigint,
    NEW.raw_user_meta_data->>'avatar_url',
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', raw_username),
    'Product engineer'
  );

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
