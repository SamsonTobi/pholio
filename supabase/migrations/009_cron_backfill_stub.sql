-- Insert logos storage bucket
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "Logos are publicly readable"
on storage.objects for select
using (bucket_id = 'logos');

create policy "Authenticated users can upload logos"
on storage.objects for insert
with check (
  bucket_id = 'logos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Placeholder for pg_cron daily-github-resync
-- Scheduled in production:
-- select cron.schedule('daily-github-resync', '0 4 * * *', 'select 1;');
