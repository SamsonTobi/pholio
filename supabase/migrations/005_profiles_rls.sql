alter table public.profiles enable row level security;

create policy "Public profiles are readable by everyone"
on public.profiles
for select
using (true);

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
