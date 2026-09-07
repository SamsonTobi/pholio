drop trigger if exists trg_hacker_groups_slug_history on public.hacker_groups;

create trigger trg_hacker_groups_slug_history
before update of slug on public.hacker_groups
for each row
execute function public.handle_slug_change();
