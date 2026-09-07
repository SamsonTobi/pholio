-- LOCAL-ONLY SEED — never run against production.
-- supabase/seed.sql is executed only by explicit local commands
-- (`supabase db reset`, `supabase seed`); `supabase db push` does NOT apply
-- it, so linked prod/staging databases are unaffected. Keep slugs/UUIDs here
-- in sync with the app's local demo fallbacks (features/*/server/service.ts).
-- NOTE: profiles.id references auth.users(id), so matching auth.users rows
-- are inserted first. `supabase db reset` runs this file; the UUIDs below
-- are reserved for local/dev only.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) values
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'tobi@local.dev',
  'local-dev-not-a-real-hash',
  now(),
  now(),
  now(),
  '{"user_name":"SamsonTobi"}'
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'siddharth@local.dev',
  'local-dev-not-a-real-hash',
  now(),
  now(),
  now(),
  '{"user_name":"siddhartharun"}'
)
on conflict (id) do nothing;

-- Seed 2 demo profiles for local/preview development
insert into public.profiles (
  id,
  slug,
  github_username,
  avatar_url,
  display_name,
  headline,
  site_url,
  template
) values
(
  '00000000-0000-0000-0000-000000000001',
  'tobi',
  'SamsonTobi',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'Tobi Samson',
  'Product engineer',
  'https://samsontobi.dev',
  'story'
),
(
  '00000000-0000-0000-0000-000000000002',
  'siddharth',
  'siddhartharun',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'Siddharth Arun',
  'Designer & full-stack builder',
  'https://siddharth.me',
  'index'
)
on conflict (id) do nothing;
