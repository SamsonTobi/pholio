alter table public.showcases enable row level security;
alter table public.mockups enable row level security;

-- Showcases RLS
create policy "Public showcases are readable"
on public.showcases
for select
using (true);

create policy "Owners can insert their showcases"
on public.showcases
for insert
with check (auth.uid() = owner_id);

create policy "Owners can update their showcases"
on public.showcases
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Owners can delete their showcases"
on public.showcases
for delete
using (auth.uid() = owner_id);

-- Mockups RLS
create policy "Public mockups are readable"
on public.mockups
for select
using (true);

create policy "Project owners can insert mockups"
on public.mockups
for insert
with check (
  exists (
    select 1 from public.projects
    where projects.id = mockups.project_id
    and projects.owner_id = auth.uid()
  )
);

create policy "Project owners can update mockups"
on public.mockups
for update
using (
  exists (
    select 1 from public.projects
    where projects.id = mockups.project_id
    and projects.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = mockups.project_id
    and projects.owner_id = auth.uid()
  )
);

create policy "Project owners can delete mockups"
on public.mockups
for delete
using (
  exists (
    select 1 from public.projects
    where projects.id = mockups.project_id
    and projects.owner_id = auth.uid()
  )
);

-- Mockups storage bucket
insert into storage.buckets (id, name, public)
values ('mockups', 'mockups', true)
on conflict (id) do nothing;

create policy "Mockups are publicly readable"
on storage.objects for select
using (bucket_id = 'mockups');

create policy "Authenticated users can upload project mockups"
on storage.objects for insert
with check (
  bucket_id = 'mockups'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can update their mockups"
on storage.objects for update
using (
  bucket_id = 'mockups'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can delete their mockups"
on storage.objects for delete
using (
  bucket_id = 'mockups'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
