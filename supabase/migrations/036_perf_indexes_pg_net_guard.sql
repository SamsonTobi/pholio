-- 036: perf-lint follow-ups + pg_net placement guard.
--
--  - Covers the two unindexed foreign keys flagged by the database linter
--    (hacker_groups.created_by, hacker_group_invites.created_by).
--  - Ensures fresh databases install pg_net outside public. pg_net does not
--    support SET SCHEMA, so existing databases must drop + recreate it
--    (done separately); on a fresh database this creates it in extensions
--    directly, and on a database where pg_net already exists it is a no-op.

create extension if not exists "pg_net" with schema extensions;

create index if not exists idx_hacker_groups_created_by
  on public.hacker_groups(created_by);

create index if not exists idx_hacker_group_invites_created_by
  on public.hacker_group_invites(created_by);
