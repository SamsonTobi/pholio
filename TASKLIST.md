# Pholio — Exhaustive Tasklist (V1, implements IMPLEMENTATION_PLAN.md)

> Order matters. Complete top to bottom. Each checkbox is one small commit (lowercase imperative). Do not skip migrations/RLS/triggers. Never hardcode domains — always use `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_TRACKER_URL`, `NEXT_PUBLIC_REALTIME_URL` via `src/lib/env.ts`. Always say "showcase", never the banned P-word.

How to mark done: `bun run check` + `bun run test` green for the touched phase, plus phase Acceptance at the bottom of each phase.

---

## Phase 0 — Foundation (monorepo, web shell, env, clients)

- [x] 0.1 Init bun workspaces root `package.json` with workspaces `apps/*`, `packages/*`, `workers/*`. Add root scripts `dev`, `check`, `test`, `lint`.
- [ ] 0.2 Scaffold `apps/web` Next.js 15 App Router TypeScript strict (`bunx create-next-app`). Enable `appDir`, `src/`, import alias `@/*`.
- [ ] 0.3 Add deps to `apps/web`: `tailwindcss@4`, `shadcn`, `lucide-react`, `next-themes`, `zustand`, `@tanstack/react-query`, `@supabase/supabase-js`, `@supabase/ssr`, `octokit`, `zod`, `react-hook-form`, `@hookform/resolvers`, `resend`, `react-email`, `vitest`, `playwright`, `eslint`, `prettier`.
- [ ] 0.4 Init Tailwind v4 (`@import "tailwindcss"`), theme tokens, dark class strategy for `next-themes`. Verify `bun run dev` renders.
- [ ] 0.5 Init shadcn (`bunx shadcn@latest init`) with `src/components/ui` path. Add `button card dialog input tabs avatar badge tooltip separator skeleton dropdown-menu`.
- [ ] 0.6 Create `packages/shared` (`package.json`, `tsconfig`, `index.ts`): export `projectSchema`, `showcaseSchema`, `mcpSchemas`, `scoring` stubs. Wire workspace dep into `apps/web`.
- [ ] 0.7 Create `packages/tracker` scaffold (`tracker.ts`, `package.json`, build script to `dist/tracker.js`). Assert gzip <1KB in CI later.
- [ ] 0.8 Create `workers/realtime` scaffold (`wrangler.toml`, `src/index.ts`, `src/do.ts` placeholders). Add `wrangler` devDep.
- [ ] 0.9 Create `supabase/` (`config.toml`, `seed.sql`, `migrations/`). Link Supabase Cloud project. Document Supabase MCP usage for migrations.
- [ ] 0.10 Create `apps/web/.env.example` with all keys from plan §3 (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_TRACKER_URL`, `NEXT_PUBLIC_REALTIME_URL`, `REALTIME_FANOUT_SECRET`, Supabase keys, `GITHUB_*`, `RESEND_API_KEY`). Add `.env.local` to `.gitignore`.
- [ ] 0.11 Implement `src/lib/env.ts` zod validation for all env. Fail fast on boot. Export `APP_URL`, `TRACKER_URL`, `REALTIME_URL` helpers (`showcaseUrl(slug)`, `inviteUrl(token)`).
- [ ] 0.12 Implement Supabase clients: `src/lib/supabase/client.ts` (browser), `server.ts` (RSC + Route), `admin.ts` (service_role, server-only), `middleware.ts` session refresh. Add `types.ts` placeholder + `bun run types:gen` script.
- [ ] 0.13 Implement root layout (`app/layout.tsx`): `next-themes` provider, React Query provider, metadata base using `NEXT_PUBLIC_APP_URL`, favicon, `sitemap.ts`, `robots.ts`.
- [ ] 0.14 Implement marketing `app/(marketing)/page.tsx` with exact copy: `Join Pholio`, `Login`, `Used by 300+ builders`, `Self-maintaining showcase for product builders`, hero sub verbatim. No other hero variants.
- [ ] 0.15 Implement nav (logged-out) + footer with links to `/login`, `/docs/agent`. Mobile responsive 360px.
- [ ] 0.16 Implement `GET /api/health` returning `{ok:true, env:APP_URL}` (no secrets). Use for deploy checks.
- [ ] 0.17 Add `bun run check` (`tsc --noEmit` + `eslint`) and `bun run test` (`vitest run`). Verify green.
- [ ] 0.18 Add banned-term CI check (fails if banned P-word appears in `apps/`, `packages/`, `workers/`).
- [ ] Acceptance 0: `bun install && bun run dev && bun run check` green, `/` shows exact copy, `/api/health` 200.

## Phase 1 — Auth, profiles, slugs, showcase shell

Migration(s):

- [ ] 1.1 Migration `001_extensions`: `create extension if not exists "pgcrypto"; create extension if not exists "pg_net"; create extension if not exists "pg_cron";`.
- [ ] 1.2 Migration `002_profiles`: table `profiles(id uuid primary key references auth.users(id) on delete cascade, slug text unique not null, github_username text unique, github_id bigint, avatar_url text, display_name text, headline text default 'Product engineer', site_url text, template text default 'story' check (template in ('story','index')), slug_history text[] default '{}', created_at timestamptz default now())`. Indexes on `slug`, `github_username`.
- [ ] 1.3 Migration `003_profile_slug_history_fn`: plpgsql `handle_slug_change()` — on update of `slug`, append `OLD.slug` to `slug_history` if not present. Trigger `trg_profiles_slug_history before update of slug on profiles`.
- [ ] 1.4 Migration `004_handle_new_user_fn`: plpgsql `handle_new_user()` for `auth.users` insert — derive initial slug from `raw_user_meta_data->>'user_name'`, lowercased, sanitized, deduped with suffix. Insert into `public.profiles`. Trigger on `auth.users`.
- [ ] 1.5 Migration `005_profiles_rls`: enable RLS. Policies: public `select` on `profiles`; owner `update` where `auth.uid()=id`; service_role bypass. No anon insert/update.
- [ ] 1.6 Seed `supabase/seed.sql` with 2 demo profiles + showcase links (dev only).

Auth + app:

- [ ] 1.7 Configure Supabase Auth GitHub provider (`GITHUB_CLIENT_ID/SECRET`, redirect `${NEXT_PUBLIC_APP_URL}/auth/callback`). No email provider.
- [ ] 1.8 Implement `app/(auth)/login/page.tsx` (`Login` heading, GitHub button, `Join Pholio` cross-link). Same OAuth flow as join, different label.
- [ ] 1.9 Implement `app/auth/callback/route.ts` (Supabase code exchange, provider_token capture note, redirect to `/pick-repos` if no projects else `/dashboard`).
- [ ] 1.10 Implement `middleware.ts` Supabase session refresh for `/dashboard/*`, `/pick-repos`, `/api/github/*`.
- [ ] 1.11 Implement `src/features/auth/server/service.ts` (`getSessionUser`, `requireUser`, `getProviderToken`).
- [ ] 1.12 Implement `src/features/profile/server/service.ts` (`getBySlug`, `getById`, `updateProfile`, `changeSlug` with history + uniqueness check, `setTemplate`).
- [ ] 1.13 Implement `src/features/profile/server/schema.ts` zod (`slug /^[a-z0-9-]{3,30}$/`, `display_name`, `headline`, `site_url`, `template`).
- [ ] 1.14 Implement public `app/[slug]/page.tsx` shell: fetch by slug, fallback lookup in `slug_history` -> `permanentRedirect` to canonical. `notFound()` if missing. Metadata + canonical via `APP_URL`.
- [ ] 1.15 Implement `app/[slug]/opengraph-image.tsx` using `APP_URL`, avatar + name + top 3 project names.
- [ ] 1.16 Implement dashboard `app/dashboard/settings/page.tsx`: edit display_name/headline/site_url/slug (with history notice + 301 preview), template radio `story|index` with preview thumbnails.
- [ ] 1.17 Regenerate `src/lib/supabase/types.ts` via Supabase CLI/MCP. Commit.
- [ ] 1.18 Vitest: slug sanitize/uniqueness, slug_history trigger logic, `showcaseUrl` uses env.
- [ ] Acceptance 1: Join with GitHub -> auto row -> live `${APP_URL}/{you}`; slug change keeps old URL 301ing.

## Phase 2 — GitHub import engine + icon extraction (incl. mobile)

Migrations:

- [ ] 2.1 Migration `006_projects`: `projects(id uuid primary key default gen_random_uuid(), owner_id uuid references profiles(id) on delete cascade, github_repo_id bigint, github_full_name text, name text not null, showcase_slug text not null, description text, readme_summary text, icon_url text, tags text[] default '{}', language text, stars int default 0, live_url text, status text default 'active' check (status in ('active','archived')), last_push_at timestamptz, telemetry_slug text unique not null, created_at timestamptz default now(), unique(owner_id, github_repo_id))`. Indexes `(owner_id)`, `(telemetry_slug)`, `(last_push_at desc)`.
- [ ] 2.2 Migration `007_github_sync_events`: `github_sync_events(id bigint generated always as identity primary key, project_id uuid references projects(id) on delete cascade, owner_id uuid, event_type text check (event_type in ('push','release','manual','cron','import')), pushed_at timestamptz default now(), commit_sha text, created_at timestamptz default now())`. Index `(project_id, pushed_at desc)`, `(owner_id, pushed_at desc)` for scoring.
- [ ] 2.3 Migration `008_projects_rls`: enable RLS. Public select projects (showcase is public — V1 all public). Owner insert/update/delete where `auth.uid()=owner_id`.
- [ ] 2.4 Storage: create bucket `logos` (public read). Policy: public select; authenticated insert/update where path starts with `{auth.uid()}/`.
- [ ] 2.5 Migration `009_cron_backfill_stub`: schedule placeholder `daily-github-resync` via `pg_cron` (full body in 2.16).

Services + UI:

- [ ] 2.6 Implement `src/lib/github.ts` Octokit factory (uses user provider_token server-side, app token fallback). Helpers `listRepos`, `getReadme`, `getRepo`, `treePaths`.
- [ ] 2.7 Implement `src/features/github-sync/server/readme.ts`: fetch `README.md`, strip markdown to summary (first 2–3 sentences + stack bullets), extract homepage/live URL, tags heuristic. Unit fixtures.
- [ ] 2.8 Implement `src/features/github-sync/server/icons.ts` resolver in order: repo root logo files -> web manifest largest icon -> favicon/link-icon -> mobile markers (Android `mipmap-xxxhdpi/ic_launcher.png` fallback xxhdpi / `AndroidManifest android:icon` / expo adaptiveIcon; iOS `AppIcon.appiconset` largest / `Info.plist` / expo ios icon; Expo `app.json expo.icon`; Flutter `assets/icon`/`pubspec`) -> org avatar -> initial tile (deterministic hue). Download to `logos/{owner_id}/{project_id}/*`, return public URL to `icon_url`. Re-resolve only if push touches icon paths.
- [ ] 2.9 Vitest icons with 4 fixtures: web-only, expo, native android/ios, no-icon fallback.
- [ ] 2.10 Implement `src/features/github-sync/server/service.ts`: `listImportableRepos` (sorted `pushed_at desc, stars desc`), `importRepos(repo_full_names[])` (creates projects + `telemetry_slug` nanoid + initial showcase draft `source=github` + sync event), `reparseProject(project_id)` (refresh stars/language/push/README/icon).
- [ ] 2.11 Implement zod `importSchema`, `resyncSchema` in `github-sync/server/schema.ts`.
- [ ] 2.12 Implement zustand `src/stores/onboarding.ts` (selected `repo_full_name[]`, toggle, pre-check top 3).
- [ ] 2.13 Implement `app/(onboarding)/pick-repos/page.tsx`: exact copy `Pick what to showcase` + sub, repo list with stars/language/pushed ago, private opt-in toggle (progressive `repo` scope notice), Confirm -> import -> redirect `${APP_URL}/{slug}`. Empty state verbatim.
- [ ] 2.14 Implement `POST /api/github/import` (auth, zod) -> service. Returns created projects.
- [ ] 2.15 Implement `POST /api/github/resync` (auth, `{project_id}` ownership check) -> reparse.
- [ ] 2.16 Implement `POST /api/webhooks/github` (verify `x-hub-signature-256` HMAC `GITHUB_WEBHOOK_SECRET`): on `push`/`release` update `last_push_at`, insert `github_sync_events`, trigger async reparse + auto-draft showcase (unpublished). Return 200 fast.
- [ ] 2.17 Implement `pg_cron` daily job `daily-github-resync`: for projects with `last_push_at < now()-24h`, touch for reparse (calls service via `net.http_post` to `/api/github/resync-batch` with service secret, or direct SQL timestamp — pick one, document). Wire schedule in migration.
- [ ] 2.18 Implement dashboard per-project `Resync` button + `Updated X ago` (`TimeAgo` shared).
- [ ] Acceptance 2: pick 3 repos -> cards show stars/language/Updated ago + icons (incl. one mobile-icon case).

## Phase 3 — Showcase templates (Story + Index)

- [ ] 3.1 Implement shared `src/components/shared/TimeAgo.tsx`, `EmptyState.tsx`, `StatusPill.tsx` (`Shipped` green pill), `StatPulse.tsx` stub.
- [ ] 3.2 Implement `DeviceFrame.tsx` (`browser|phone|tablet` frames, 16/9, rounded-2xl border shadow, `object-cover`).
- [ ] 3.3 Implement `ShowcaseHeaderCard.tsx` (Variant A top card: 56px avatar, name 18 semibold, headline muted, right `Member`/`Joined MM/DD/YY` + `Chat` pill ghost with tooltip `Coming soon`, `mailto:` fallback, no chat backend).
- [ ] 3.4 Implement `ProjectRail.tsx` (64px left rail, 40px rounded-xl icons from `icon_url` or initial tile, active ring, expand chevron, anchor scroll `#project-{showcase_slug}`).
- [ ] 3.5 Implement `StoryProjectSection.tsx` (28px icon + H2 `{Name} – {Tagline}` + external link, `Shipped` + avatar stack, paragraphs `text-slate-600 leading-7 max-w-3xl`, hero `DeviceFrame browser`).
- [ ] 3.6 Implement Variant A assembly in `app/[slug]/page.tsx` when `template=story`: `max-w-5xl grid-cols-[64px_1fr]`, sorted `last_push_at desc`, archived collapsed at bottom.
- [ ] 3.7 Implement `IndexHeader.tsx`, `IndexTabs.tsx` (`Posts Information` left, `Compose ...` right; Compose -> dashboard composer, `...` owner menu, read-only for visitors), `IndexProjectRow.tsx` (underlined title, muted subtitle, blurb, thumbs row -> `[slug]/[projectSlug]`), `NowSection.tsx` (pinned latest showcase), `PreviouslySection.tsx` (archived + bio lines).
- [ ] 3.8 Implement Variant B assembly (`max-w-xl`) when `template=index`.
- [ ] 3.9 Implement `app/[slug]/[projectSlug]/page.tsx` deep view (reuse story section + full showcase timeline for project).
- [ ] 3.10 Wire template switch in settings to revalidate `[slug]` (revalidatePath). Verify toggle changes public page.
- [ ] 3.11 Responsive pass 360px + 1280px, light theme pixel-close to mockups. `next-themes` dark deferred (no dark QA blocking).
- [ ] 3.12 Playwright: template toggle persists, anchors scroll, archived handling.
- [ ] Acceptance 3: both variants render from same data, match mockup structure, responsive.

## Phase 4 — Mockups + showcases composer

Migrations:

- [ ] 4.1 Migration `010_showcases`: `showcases(id uuid primary key default gen_random_uuid(), project_id uuid references projects(id) on delete cascade, owner_id uuid references profiles(id) on delete cascade, body text check (char_length(body) between 10 and 600), meta jsonb default '{}', published_at timestamptz default now(), source text check (source in ('github','agent','manual')))`. Indexes `(project_id, published_at desc)`, `(owner_id, published_at desc)`.
- [ ] 4.2 Migration `011_mockups`: `mockups(id uuid primary key default gen_random_uuid(), project_id uuid references projects(id) on delete cascade, storage_path text not null, device text check (device in ('browser','phone','tablet')), sort int default 0)`. Index `(project_id, sort)`.
- [ ] 4.3 Migration `012_showcases_mockups_rls`: RLS — public select published showcases + mockups of public projects; owner CRUD where `auth.uid()=owner_id` (via projects.owner_id join check).
- [ ] 4.4 Storage: bucket `mockups` (public read). Policies: public select; owner insert/update/delete under `mockups/{auth.uid()}/{project_id}/*`.

Services + UI + API:

- [ ] 4.5 `src/features/showcases/server/schema.ts` zod (`body` 10..600, `project_id`, `source`).
- [ ] 4.6 `src/features/showcases/server/service.ts` (`publish`, `update`, `remove`, `listByProject`, `listByOwner`, `pinNow` flag in meta).
- [ ] 4.7 `src/features/mockups/server/schema.ts` + `service.ts` (`upload` validates png/jpg/webp/svg <5MB, writes Storage, row; `setDevice`, `reorder`, `remove`).
- [ ] 4.8 `POST/GET/PATCH/DELETE /api/showcases` thin routes (auth for writes, zod, ownership).
- [ ] 4.9 `POST/DELETE /api/mockups` + `PATCH /api/mockups/device` (multipart via Server Action preferred; API fallback for MCP binary via base64).
- [ ] 4.10 Dashboard `app/dashboard/showcases/page.tsx` timeline (drafts from pushes + published, one-click Publish, edit inline, pin to Now).
- [ ] 4.11 Dashboard `app/dashboard/projects/[id]/page.tsx`: edit name/tagline/description/tags/live_url/status, mockup drag-drop + device toggle + sort, Resync, snippet link.
- [ ] 4.12 Dashboard `app/dashboard/projects/page.tsx` list with filters (zustand `dashboard-ui`: search, status).
- [ ] 4.13 Bind Now/Previously: Now = pinned showcase selector; Previously = archived projects + free-text bio lines on profile (`bio_previously` — add column in migration `013_profile_bio` if missing).
- [ ] 4.14 Vitest: body length validation, pin logic, mockup sort.
- [ ] Acceptance 4: upload appears framed on public page; publish appears in feed + Now if pinned.

## Phase 5 — Telemetry (7-day, tracker + ingest + rollup)

Migrations + cron:

- [ ] 5.1 Migration `014_raw_events`: `raw_events(id bigint generated always as identity primary key, telemetry_slug text not null, session_hash text not null, path text, ts timestamptz default now())`. Indexes `(telemetry_slug, ts desc)`, `(telemetry_slug, session_hash, ts)`.
- [ ] 5.2 Migration `015_daily_stats`: `daily_stats(project_id uuid references projects(id) on delete cascade, day date not null, visitors int default 0, actives_7d int default 0, total int default 0, primary key (project_id, day))`. Index `(project_id, day desc)`.
- [ ] 5.3 Migration `016_rollup_fn`: plpgsql `rollup_daily_stats()` — dedupe `(telemetry_slug, session_hash, 5min bucket)`, count visitors/day, compute `actives_7d` rolling, upsert `daily_stats`. Add `purge_raw_events()` deleting `ts < now()-30d`.
- [ ] 5.4 Migration `017_telemetry_cron`: `pg_cron` jobs `rollup-15min` (`*/15 * * * *`) + `purge-raw-daily` (`0 3 * * *`). Use `service_role` connection.
- [ ] 5.5 Migration `018_telemetry_rls`: RLS — public select `daily_stats`; `raw_events` insert via service_role only (no anon insert policy; Next API uses admin client).

Tracker + API + UI:

- [ ] 5.6 Implement `packages/tracker/tracker.ts`: session in `sessionStorage` (no cookie), 30s heartbeat + visibilitychange, `sendBeacon POST /api/ingest {telemetry_slug, path}` batched. Build to `dist/tracker.js`. Serve at `NEXT_PUBLIC_TRACKER_URL` (Next static + Cloudflare CDN note).
- [ ] 5.7 Add CI assert tracker gzip <1KB (`gzip -c dist/tracker.js | wc -c`).
- [ ] 5.8 Implement `POST /api/ingest` (public, rate-limit 60/min/IP via LRU + `Retry-After`, zod `telemetry_slug+path`, admin insert to `raw_events`). Errors `{error}` shape.
- [ ] 5.9 Implement `GET /api/stats?project_slug&days=7` (public, reads `daily_stats` only, returns `{days:[{day,visitors,actives_7d}], totals}`).
- [ ] 5.10 Implement `src/features/telemetry/server/service.ts` (`getStats`, `hasEvents` for verified badge).
- [ ] 5.11 Implement dashboard snippet tab: HTML + Next.js variants with copy buttons using `NEXT_PUBLIC_TRACKER_URL`, privacy line `No cookies. No fingerprinting. Counts only.`, badge `Receiving events` when `hasEvents`.
- [ ] 5.12 Implement dashboard charts (visitors 7d bars + actives sparkline, `recharts` or minimal SVG — pick `recharts`, document). React Query `refetchInterval 60_000`.
- [ ] 5.13 Show `Visitors 7d` + `Actives 7d` on public showcase (from `daily_stats`, no raw exposure).
- [ ] 5.14 Playwright: inject snippet -> ingest -> badge lights -> chart moves.
- [ ] Acceptance 5: snippet E2E verified, 7d numbers move, bundle size gate green.

## Phase 6 — Hacker groups, leaderboard, notifications, email

Migrations:

- [ ] 6.1 Migration `019_hacker_groups`: `hacker_groups(id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, visibility text check (visibility in ('public','private')) default 'private', created_by uuid references profiles(id), slug_history text[] default '{}', created_at timestamptz default now())`. Index `slug`.
- [ ] 6.2 Migration `020_group_members`: `hacker_group_members(group_id uuid references hacker_groups(id) on delete cascade, user_id uuid references profiles(id) on delete cascade, role text check (role in ('owner','member')) default 'member', joined_at timestamptz default now(), primary key (group_id, user_id))`. Index `(user_id)`.
- [ ] 6.3 Migration `021_group_invites`: `hacker_group_invites(id uuid primary key default gen_random_uuid(), group_id uuid references hacker_groups(id) on delete cascade, token text unique not null, github_username text, created_by uuid, used_at timestamptz, multi_use boolean default true, created_at timestamptz default now())`. Index `(token)`, `(group_id)`.
- [ ] 6.4 Migration `022_leaderboard_snapshots`: `leaderboard_snapshots(group_id uuid references hacker_groups(id) on delete cascade, day date not null, rankings jsonb not null, primary key (group_id, day))`.
- [ ] 6.5 Migration `023_notifications`: `notifications(id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade, type text check (type in ('digest','spike','peer_push','invite')), payload jsonb default '{}', read_at timestamptz, created_at timestamptz default now())`. Index `(user_id, created_at desc)`.
- [ ] 6.6 Migration `024_hacker_rls`: RLS — public select public groups + their members/snapshots; members select private group rows; owners insert/update invites/members; owner-only notifications select/update; service_role writes snapshots/notifications.
- [ ] 6.7 Migration `025_group_slug_history_fn`: same history trigger as profiles for `hacker_groups.slug`.
- [ ] 6.8 Migration `026_leaderboard_cron`: `pg_cron` daily `compute-leaderboard` calling scoring (via Worker cron or `net.http_post` to `/api/cron/leaderboard` with secret — implement route + secret `CRON_SECRET`, document choice).

Services + UI + email:

- [ ] 6.9 Implement `src/features/leaderboard/server/scoring.ts`: `pushes_7d` from `github_sync_events`, `showcases_7d` from `showcases`, `recency_bonus` 5/2/0, `activity_score = pushes_7d*10 + showcases_7d*15 + recency_bonus`. Export pure fn + thresholds const. Vitest 5 cases + delta calc.
- [ ] 6.10 Implement `hacker-groups/server/service.ts` (create, rename slug with history, visibility, invite create/revoke, join by token, add by GitHub username, list members with scores, leave/remove).
- [ ] 6.11 Implement `leaderboard/server/service.ts` (`compute(group_id)` -> snapshot, `get(group_slug)` respects visibility, spike detect `actives_7d +40% vs 48h`).
- [ ] 6.12 Implement `notifications/server/service.ts` (`list`, `markRead`, `create` service_role only).
- [ ] 6.13 Implement zod schemas for group/invite/join.
- [ ] 6.14 Implement `CRUD /api/hacker-groups`, `POST /api/hacker-groups/join` (token exchange -> member row), `GET /api/leaderboard?group_slug`.
- [ ] 6.15 Implement `POST /api/cron/leaderboard` (verify `CRON_SECRET`, loops groups, writes snapshots, creates spike/peer_push notifications).
- [ ] 6.16 Implement `app/hacker-groups/[groupSlug]/page.tsx`: header (name, Public/Private badge, count, `Copy invite link` owner-only + GitHub-username add), leaderboard (rank, avatar, name + `@slug`, score, pushes/showcases, `Updated X ago`, you-highlight, delta ▲/▼/–), peer feed (latest showcases + pushes), empty `No members yet — share the invite link.` Private gate: redirect non-members to join page.
- [ ] 6.17 Implement `app/hacker-groups/join/[token]/page.tsx` (validate token, Join button -> member).
- [ ] 6.18 Implement dashboard `app/dashboard/hacker-groups/page.tsx` (create, list, member manage).
- [ ] 6.19 Implement notifications bell + feed (in-app list, read state).
- [ ] 6.20 Implement Resend templates (`digest`, `spike`, `invite`) with `react-email`, all links via `APP_URL`. Weekly digest cron + instant spike send in leaderboard cron. Add `RESEND_API_KEY` + `CRON_SECRET` to env example.
- [ ] 6.21 Playwright: 2 users, push changes score/rank, invite link join, digest row created.
- [ ] Acceptance 6: leaderboard reorders after push, peer feed updates, emails queued.

## Phase 7 — Realtime fan-out (pg_net -> Cloudflare Worker DO)

Migrations (Supabase):

- [ ] 7.1 Migration `027_realtime_outbox`: `realtime_outbox(id bigint generated always as identity primary key, table_name text, row_id text, channel text not null, payload jsonb, created_at timestamptz default now())`. Index `(channel, created_at desc)`.
- [ ] 7.2 Migration `028_fanout_fn`: plpgsql `notify_fanout()` using `net.http_post('${WORKER_URL}/fanout', jsonb, headers '{"x-fanout-secret": "..."}')`. Reads Worker URL + secret from `vault` or `current_setting` — document choice, never commit secret. Inserts to `realtime_outbox` first, then posts.
- [ ] 7.3 Migration `029_fanout_triggers`: triggers `trg_showcases_fanout after insert or update on showcases` (channel `showcase:{owner_slug}` + `hacker-group:{group_ids}`), `trg_daily_stats_fanout`, `trg_leaderboard_fanout`. Channel derivation via helper fns.
- [ ] 7.4 Migration `030_outbox_purge_cron`: `pg_cron` hourly purge `realtime_outbox older than 7d`.

Worker (`workers/realtime`):

- [ ] 7.5 `wrangler.toml`: `name=realtime`, DO binding `REALTIME_ROOM`, vars `FANOUT_SECRET` (secret), `APP_URL` (plain). Env-specific `dev`/`prod` URLs. Document `wrangler secret put FANOUT_SECRET`.
- [ ] 7.6 `src/do.ts` Durable Object `RealtimeRoom`: `fetch` handles WS upgrade `/subscribe?channel=`, attach/detach sessions, `broadcast(json)`, heartbeat, cap 100 conns/room, JSON `{type,id,updated_at}`.
- [ ] 7.7 `src/index.ts`: `POST /fanout` (verify `x-fanout-secret`, resolve stub `showcase:{slug}` / `hacker-group:{id}`, forward), `GET /subscribe` (route to DO), `GET /health`, scheduled cron (optional keepalive/rollup trigger). No secrets logged.
- [ ] 7.8 `wrangler dev` + `wrangler deploy` verified, `NEXT_PUBLIC_REALTIME_URL` points at it per env.

Frontend:

- [ ] 7.9 Implement `src/lib/realtime-client.ts` `useRealtimeChannel(channel, onMessage)` (WS to `REALTIME_URL`, exponential backoff, `onerror` falls back silently to polling).
- [ ] 7.10 Wire channels: `[slug]` page subscribes `showcase:{slug}`, hacker group page `hacker-group:{id}`. On message invalidate React Query `stats`/`showcases`/`leaderboard` keys.
- [ ] 7.11 Keep `refetchInterval: 60_000` fallback on all realtime queries. Document "period-based, not strict live".
- [ ] 7.12 Playwright/manual: publish showcase -> open page updates <5s; kill WS -> still updates within 60s.
- [ ] Acceptance 7: fan-out E2E green, outbox rows created, no Supabase Realtime used.

## Phase 8 — MCP + agent docs

- [ ] 8.1 Migration `031_api_keys`: `api_keys(id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade, name text, prefix text not null, key_hash text not null, scopes text[] default '{showcase:write}', revoked_at timestamptz, created_at timestamptz default now())`. Index `(user_id)`, unique `(prefix)`. RLS owner select, no anon.
- [ ] 8.2 Implement `src/features/agent-keys/server/service.ts`: `generate(name)` returns plaintext once (`PHOLIO_...`, store `prefix` + `sha256`), `list` (prefix only), `revoke`. Constant-time compare helper.
- [ ] 8.3 Implement settings `app/dashboard/api-keys/page.tsx`: generate/revoke, `Copy once — it won't be shown again.` warning.
- [ ] 8.4 Define `packages/shared/mcpSchemas.ts` zod for all 6 tools (see plan §12, body 10..600).
- [ ] 8.5 Implement `/api/mcp` Streamable HTTP via `@modelcontextprotocol/sdk`: Bearer auth, scope check, route to existing services (`projects.update`, `showcases.publish`, `github-sync.reparse`, `mockups.upload(base64)`, `telemetry.getStats`, `leaderboard.get`). Thin wrapper only.
- [ ] 8.6 Implement `app/docs/agent/page.tsx`: dynamic MCP JSON with `NEXT_PUBLIC_APP_URL` + `PHOLIO_BASE_URL`, copy buttons, master prompt block, tool table.
- [ ] 8.7 Add `packages/mcp-server` thin wrapper (`npx -y @pholio/mcp-server` entry) re-exporting schemas + client pointing at `PHOLIO_BASE_URL`. Document publish later.
- [ ] 8.8 E2E: with fresh API key, MCP client updates project + publishes showcase + syncs README + fetches stats/leaderboard.
- [ ] Acceptance 8: Cursor with key completes full loop without dashboard.

## Phase 9 — Hardening, tests, deploy

- [ ] 9.1 RLS matrix tests (vitest + Supabase): anon cannot write, owner can, private group blocked, public readable, service_role paths only via admin.
- [ ] 9.2 Rate-limit tests for `/api/ingest` (60/min/IP -> 429 + `Retry-After`).
- [ ] 9.3 Tracker size + privacy asserts (gzip <1KB, no cookie/document.cookie usage).
- [ ] 9.4 Playwright flows: join->import->showcase live; template toggle; snippet verified; hacker group invite join + leaderboard; MCP publish (mock client).
- [ ] 9.5 A11y pass (axe on `/`, `[slug]`, group page), keyboard nav for rail/tabs, alt text for icons/mockups.
- [ ] 9.6 Perf: RSC where possible, `next/image` for avatars/mockups/icons, OG cached, charts lazy.
- [ ] 9.7 Banned-term + env-hardcode grep CI (no `localhost`, no `pholio.dev`, no direct domains outside `env.ts` + docs placeholder).
- [ ] 9.8 Deploy checklist: Vercel envs from `.env.example` with prod `APP_URL`; Supabase Auth redirect allowlist prod URL, webhook URL `${APP_URL}/api/webhooks/github`; Storage CORS; `pg_cron`/`pg_net` enabled; Cloudflare `wrangler deploy` + secrets; Resend domain verified.
- [ ] 9.9 Senior review per `AGENTS.md` (correctness, bugs, arch, quality, integration, security, perf, errors, consistency). Fix Critical/Important before close.
- [ ] Acceptance 9: all checks green on prod URL derived purely from env.

---

## Cross-cutting DoD (every task)

- Zod validates inputs; errors `{error:string}` with correct status; no stack to client.
- Service logic in `features/*/server/service.ts`, routes thin, MCP reuses services.
- `bun run check` + relevant `vitest` green. Small lowercase commits.
