create or replace function public.handle_slug_change()
returns trigger as $$
begin
  if OLD.slug is distinct from NEW.slug then
    if not (OLD.slug = any(coalesce(NEW.slug_history, '{}'))) then
      NEW.slug_history = array_append(coalesce(NEW.slug_history, '{}'), OLD.slug);
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_slug_history on public.profiles;

create trigger trg_profiles_slug_history
before update of slug on public.profiles
for each row
execute function public.handle_slug_change();
