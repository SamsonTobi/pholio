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
