alter table public.projects enable row level security;
alter table public.github_sync_events enable row level security;

create policy "Public projects are readable by everyone"
on public.projects
for select
using (true);

create policy "Owners can insert their projects"
on public.projects
for insert
with check (auth.uid() = owner_id);

create policy "Owners can update their projects"
on public.projects
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Owners can delete their projects"
on public.projects
for delete
using (auth.uid() = owner_id);

create policy "Public sync events readable"
on public.github_sync_events
for select
using (true);

create policy "Owners insert sync events"
on public.github_sync_events
for insert
with check (auth.uid() = owner_id);
