# Pholio — Implementation Plan (for coding agent)

> Source of truth for building Pholio V1. Follow this file top to bottom. Do not invent alternatives. Ask the owner if anything here is ambiguous. Do not assume.
> Terminology rule: always say "showcase" (e.g. showcase page, showcase card, showcase site). Never use the banned P-word in code, UI, comments, or docs.

## 0. What Pholio is

Pholio is a self-maintaining showcase for product builders. Connect GitHub once, pick repos, get a living showcase site at `{BASE_URL}/{slug}` with zero manual maintenance. It pulls context from READMEs, finds logos/icons (including mobile app icons), shows 7-day visitor analytics (not strict live counts), supports daily showcases, hacker groups with activity leaderboards, and lets coding agents update the showcase via MCP from the local codebase.

Core principles (from `AGENTS.md`):

- Simplest implementation that fully meets requirements. No speculative abstractions.
- Layered growth: every phase ends with a working end-to-end slice.
- Modular, feature-based code. Shared UI in one place only.
- Long-term decisions, no stopgaps.
- Library selection: prefer established libs. Lean on deps already in the project.

## 1. UX writing (exact strings — do not rephrase)

- Nav logged-out primary CTA: `Join Pholio`
- Nav logged-out secondary: `Login`
- Hero eyebrow / social proof: `Used by 300+ builders`
- Hero H1: `Self-maintaining showcase for product builders`
- Hero sub (use verbatim): `Connect GitHub once. Pholio builds your showcase, tracks visitors, and stays updated from your pushes — or straight from your coding agent.`
- Onboarding headline: `Pick what to showcase`
- Onboarding sub: `Pre-selected from your most active repos. Confirm and you're live.`
- Empty repos: `No importable repos yet — push code, then hit Resync.`
- No telemetry: `Add the 1-line snippet to light up visitor stats.`
- Snippet verified badge: `Receiving events`
- Showcase status pill: `Shipped`
- Hacker group invite CTA: `Copy invite link`
- API key copy hint: `Copy once — it won't be shown again.`

All buttons use sentence case except `Join Pholio` / `Login` which are fixed.

## 2. Tech stack (locked)

| Layer | Choice |
|---|---|
| App | Next.js 15 App Router, TypeScript strict, `bun` as package manager |
| Styling | Tailwind CSS v4 + shadcn/ui + `lucide-react` + `next-themes` |
| Client UI state only | `zustand` (onboarding selection, dashboard filters, modals). Never server data. |
| Server state | React Server Components + Server Actions + `@tanstack/react-query` for stats with polling fallback |
| DB / Auth / Storage | Supabase Cloud (Postgres + Auth GitHub OAuth only + Storage for mockups/avatars) |
| Dev DB tooling | Supabase MCP server for migrations/inspection (not hosting) |
| GitHub | `octokit`, GitHub webhooks (`push`, `release`), daily `pg_cron` re-sync |
| Validation | `zod` shared in `packages/shared` for env, forms, API, MCP args |
| Forms | `react-hook-form` + `@hookform/resolvers` |
| Email | `resend` + `react-email` for digests, invites, spike alerts |
| Realtime | Supabase Postgres triggers via `pg_net` -> Cloudflare Workers + Durable Objects. No Supabase Realtime. Fallback: 60s polling. |
| Tracker | Vanilla `<1KB` `tracker.js`, `navigator.sendBeacon`, no cookies, batched heartbeats |
| MCP | `@modelcontextprotocol/sdk` Streamable HTTP at `/api/mcp`, `PHOLIO_API_KEY` per user (prefix + sha256 hash) |
| Cron | `pg_cron` in Supabase + one Cloudflare Worker cron for rollups/fan-out |
| Tests | `vitest` (unit) + `playwright` (E2E) |
| Lint/format | `eslint` + `prettier` (Next defaults) |
| Deploy web | Vercel (`apps/web`) |
| Deploy realtime/tracker CDN | Cloudflare Workers via `wrangler` (`workers/realtime`) |

Do not add Turbo, Biome, tRPC, Prisma/Drizzle (use Supabase clients + SQL migrations), or another analytics vendor.

## 3. Env variables (base URL via env — never hardcode domain)

The production domain is unknown. All URLs derive from env.

```bash
# apps/web/.env.example
NEXT_PUBLIC_APP_URL=http://localhost:3000 # e.g. https://pholio.dev in prod. Used for showcase links, OG, redirects, invite links.
NEXT_PUBLIC_TRACKER_URL=http://localhost:3000/tracker.js # or https://cdn.pholio.dev/tracker.js in prod. Built from packages/tracker.
NEXT_PUBLIC_REALTIME_URL=wss://localhost:8787 # Cloudflare Worker URL, e.g. wss://realtime.pholio.dev
REALTIME_FANOUT_SECRET=dev-secret # shared between Supabase pg_net trigger and Worker
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=
RESEND_API_KEY=
```

Rules for implementing agent:

- Never hardcode `pholio.dev`, `localhost:3000`, `cdn.*`, or `realtime.*`. Always read `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_TRACKER_URL`, `NEXT_PUBLIC_REALTIME_URL`.
- Showcase URL = `${NEXT_PUBLIC_APP_URL}/${slug}`.
- Tracker snippet `src` = `${NEXT_PUBLIC_TRACKER_URL}` with `data-project="{telemetry_slug}"`.
- Invite link = `${NEXT_PUBLIC_APP_URL}/hacker-groups/join/{token}`.
- OG images, canonicals, sitemap, emails all use `NEXT_PUBLIC_APP_URL`.
- Validate all env with `zod` in `src/lib/env.ts`. Fail fast on boot if missing.

## 4. Architecture

```
GitHub OAuth / Octokit / Webhooks
  -> Next.js RSC + Server Actions + /api/* (thin handlers)
  -> Supabase Postgres (RLS) + Storage
  -> pg_net triggers on showcases|daily_stats|leaderboard_snapshots
    -> Cloudflare Worker + Durable Objects (channel per showcase + per hacker group)
      -> browser WS/SSE via useRealtimeChannel, fallback 60s React Query polling
Tracker snippet -> POST /api/ingest -> raw_events -> daily rollup cron -> daily_stats
MCP clients (Cursor/Claude/Desktop) -> /api/mcp (API key) -> same service layer as Actions
Resend -> digest / spike / invite emails + in-app notifications table
```

Service-layer rule: `app/api/*` and `app/actions/*` must be thin. All logic lives in `src/features/<name>/server/service.ts`. MCP tools call the same service functions. No duplicated logic.

Ingest V1: keep ingest on Next.js `/api/ingest` for simplicity. Worker only does fan-out. Do not move ingest to Workers in V1.

Realtime flow:

1. Migration enables `pg_net` + `pg_cron`, creates `realtime_outbox(table_name, row_id, channel, payload, created_at)` and trigger fn on `showcases`, `daily_stats`, `leaderboard_snapshots`.
2. Trigger does `net.http_post('${WORKER_FANOUT_URL}/fanout', body, headers {x-fanout-secret})`.
3. Worker validates secret, resolves DO stub by `showcase:{slug}` or `hacker-group:{id}`, broadcasts JSON `{type, id, updated_at}`.
4. Frontend `useRealtimeChannel(channel)` connects to `${NEXT_PUBLIC_REALTIME_URL}/subscribe?channel=...`. On message, invalidate matching React Query key. If WS errors, rely on `refetchInterval: 60_000`.

Analytics is period-based, not strict live: UI shows `Visitors (7d)`, `Actives (7d)`, trend sparkline from `daily_stats`. Realtime only fast-forwards the already-aggregated numbers.

## 5. Data model (Supabase Postgres + RLS)

Tables:

- `profiles(id uuid PK = auth.users.id, slug text unique, github_username text unique, github_id bigint, avatar_url text, display_name text, headline text, template text default 'story', slug_history text[] default '{}', created_at)`
- `projects(id uuid PK, owner_id FK profiles, github_repo_id bigint, github_full_name text, name text, showcase_slug text, description text, readme_summary text, tags text[], language text, stars int default 0, live_url text, status text default 'active' check active|archived, last_push_at timestamptz, telemetry_slug text unique, created_at)`
- `showcases(id uuid PK, project_id FK, owner_id FK, body text check char_length 10..600, meta jsonb default '{}', published_at timestamptz, source text check github|agent|manual)`
- `mockups(id uuid PK, project_id FK, storage_path text, device text check browser|phone|tablet, sort int)`
- `raw_events(id bigint, telemetry_slug text, session_hash text, path text, ts timestamptz default now())` — no IP, no cookie, 30-day TTL via cron delete.
- `daily_stats(project_id FK, day date, visitors int, actives_7d int, total int, PK(project_id, day))` — rollup source of truth.
- `hacker_groups(id uuid PK, slug text unique, name text, visibility text check public|private, created_by FK, created_at)`
- `hacker_group_members(group_id FK, user_id FK profiles, role text check owner|member, joined_at, PK(group_id, user_id))`
- `hacker_group_invites(group_id FK, token text unique, github_username text null, created_by FK, used_at null, created_at)`
- `leaderboard_snapshots(group_id FK, day date, rankings jsonb, PK(group_id, day))` — `rankings: [{user_id, slug, display_name, avatar_url, activity_score, delta, pushes_7d, showcases_7d}]`
- `notifications(user_id FK, id uuid PK, type text check digest|spike|peer_push|invite, payload jsonb, read_at null, created_at)`
- `api_keys(id uuid PK, user_id FK, name text, prefix text, key_hash text, scopes text[] default '{showcase:write}', revoked_at null, created_at)`

RLS:

- Public read: `profiles` (by slug), `projects` where owner showcase is public, `showcases` (published), `daily_stats`, public `hacker_groups` + members list.
- Owner-only write: `profiles`, `projects`, `showcases`, `mockups`, `api_keys`.
- Group: members read private group pages; owners manage invites.
- `service_role` only: insert `raw_events`, `daily_stats` rollup, `leaderboard_snapshots`, send fan-out.

Slug change: on `profiles.slug` update, append old slug to `slug_history`, keep 301 map. Never break old links. Same for `hacker_groups.slug`.

Activity score (hacker groups) — frequency-based, recomputed daily:

```
pushes_7d = count distinct push days touching owner's showcased repos (from github_sync_events or last_push_at log)
showcases_7d = count showcases published in last 7d
recency_bonus = 5 if last_push_at < 24h, 2 if < 72h, else 0
activity_score = pushes_7d * 10 + showcases_7d * 15 + recency_bonus
```

Store `pushes_7d`, `showcases_7d`, `activity_score` in snapshot. Sort desc. `delta` = rank change vs prior day. Display as integer + `Updated Xh ago` per member. Keep formula in `src/features/leaderboard/server/scoring.ts` with unit tests. Thresholds configurable, no schema change to tune.

Growth spike: `actives_7d` up >=40% vs prior 48h window per project. Notify owner + hacker group peers via `notifications` + email.

## 6. File structure (feature-based, Bun workspaces)

```
apps/web/
  app/(marketing)/page.tsx
  app/(auth)/login/page.tsx
  app/(onboarding)/pick-repos/page.tsx
  app/[slug]/page.tsx                    # public showcase page (template switch story|index)
  app/[slug]/[projectSlug]/page.tsx      # per-project deep view (uses story section anchor)
  app/dashboard/{projects,showcases,hacker-groups,settings,api-keys}/page.tsx
  app/hacker-groups/[groupSlug]/page.tsx # hacker group page (see §9)
  app/api/{ingest,github,webhooks,stats,showcases,hacker-groups,mcp}/route.ts
  src/features/
    auth/ profile/ projects/ showcases/ mockups/
    telemetry/ hacker-groups/ leaderboard/ notifications/ agent-keys/ github-sync/
      server/service.ts  server/schema.ts  components/*  hooks/*
  src/components/ui/*        # shadcn only
  src/components/shared/*    # ShowcaseHeader, ProjectRail, DeviceFrame, StatPulse, TimeAgo, EmptyState, InviteCopy
  src/lib/{env,supabase/{client,server,admin},github, resend, realtime-client}.ts
  src/stores/{onboarding, dashboard-ui}.ts
workers/realtime/
  src/{index.ts, do.ts}  wrangler.toml
packages/shared/  {projectSchema, showcaseSchema, mcpSchemas, scoring}
packages/tracker/  tracker.ts -> dist/tracker.js
supabase/{migrations/*.sql, seed.sql}
```

Rules:

- New capability = new folder under `src/features/`. Never scatter feature code in `lib` or `app`.
- `components/ui` = shadcn primitives only. `components/shared` = cross-feature presentational only, no data fetching.
- Zustand stores: `onboarding` (selected repo ids), `dashboard-ui` (filter, tab, modal). No fetched data in zustand.
- All Supabase table types generated via Supabase MCP / CLI into `src/lib/supabase/types.ts`.

Commands (bun):

```
bun install
bun run dev          # apps/web
bun run check        # tsc --noEmit + eslint
bun run test         # vitest
bunx supabase migration new <name>
bunx shadcn@latest add button card dialog input tabs avatar badge
wrangler dev --cwd workers/realtime
wrangler deploy --cwd workers/realtime
```

## 7. Userflows (minimal effort)

1. Land -> Join: `/` hero (`Join Pholio` primary, `Login` ghost, `Used by 300+ builders`, H1) -> GitHub OAuth (`read:user public_repo`; progressive `repo` opt-in toggle on pick-repos screen for private). Auto-create `profiles` row from GitHub username/avatar.
2. Onboard 2-click: `/pick-repos` lists repos sorted `pushed_at desc + stars`, top 3 pre-checked (zustand). Confirm -> server imports README summary, logo/icon, stars/language, creates `projects` + initial `showcases` draft marked `source=github`. Redirect to `${APP_URL}/{slug}`. No required forms.
3. Stay fresh zero-effort: webhook `push`/`release` -> queue re-parse + update `last_push_at` + auto-draft showcase (dashboard one-click Publish, or agent publishes). Daily `pg_cron` backfills missed. Per-project `Resync` button escape hatch.
4. Mockups: dashboard drag-drop -> Storage bucket `mockups/{user_id}/{project_id}/*` -> toggle `browser|phone|tablet` in `DeviceFrame`. Agent path `pholio_upload_mockup` from local file path.
5. Telemetry: dashboard snippet tab shows HTML + Next.js variants with copy buttons + `Receiving events` badge after first ingest. Only needs `data-project="{telemetry_slug}"`.
6. Daily showcases: timeline suggests drafts from pushes. Publish = 1–3 plain sentences, Zod `maxLength 600`, no hype words.
7. Hacker groups: Create -> `Copy invite link` (`${APP_URL}/hacker-groups/join/{token}`) or add by GitHub username -> leaderboard auto-updates daily, digests auto-sent. No manual scoring.
8. Agent: Settings -> API keys -> generate -> copy `PHOLIO_API_KEY` once -> paste MCP JSON (see §11). Agent updates from editor, no dashboard needed.

Auth: GitHub OAuth only. No email/password/magic link. `Login` = same OAuth flow, different entry label.

## 8. Showcase page — two variants (from provided mockups)

Implement `template` field on `profiles` (`story` | `index`), switchable in Settings -> Showcase style. Default `story`. Both SSR (RSC), responsive, light theme first to match mockups, support dark via `next-themes` later.

Shared header data: `avatar_url`, `display_name`, `headline` (e.g. Product engineer), `Member / Joined MM/DD/YY`, personal site link if present.

### Variant A — "Story" (Image 1: Samson Tobi)

Layout:

- Top: rounded-3xl muted card (`bg-muted/60 rounded-[24px] p-6`): left avatar 56px + name (semibold 18) + headline (16 muted); right: `Member` + `Joined {date}` stacked muted small + `Chat` pill button (ghost border, message icon; V1 can be `mailto:` or no-op with tooltip `Coming soon` — do not build chat).
- Body grid: `grid-cols-[64px_1fr] gap-8 max-w-5xl mx-auto`.
- Left rail: vertical stack of project icons 40px rounded-xl (logo image or fallback initial with deterministic bg color from project id). Active = ring. Overflow `...` chevron expands. Clicking scrolls to project section (anchor `#project-{slug}`), no page nav.
- Main: per project section:
  - Row: 28px icon + H2 20px semibold `{Name} – {Tagline}` + external-link icon linking `live_url` or GitHub.
  - Row: `Shipped` pill (`bg-green-100 text-green-700`) + collaborator avatar stack (if any).
  - Narrative paragraphs (`text-slate-600 leading-7`, max-w-3xl) sourced from `readme_summary` + latest `showcases` body. Preserve line breaks.
  - Hero mockup: full-width `DeviceFrame browser` rounded-2xl border shadow, 16/9, `object-cover`.
- Order: `sort by last_push_at desc`. Archived at bottom collapsed.

Components: `ShowcaseHeaderCard`, `ProjectRail`, `StoryProjectSection`, `DeviceFrame`, `StatusPill`, `TimeAgo`.

### Variant B — "Index" (Image 2: Siddharth Arun)

Layout:

- Narrow centered column `max-w-xl mx-auto px-6`.
- Top: avatar 48px, name 16 semibold, headline muted, site link underlined, `Member / Joined` muted small with icon.
- Tabs row: left `Posts  Information`, right `Compose  ...` (Compose opens dashboard showcase composer; `...` = owner menu; visitors see read-only).
- `Projects` label muted + entries: title underlined semibold, subtitle muted, optional 1–3 sentence blurb, thumbnail row (3 small rounded thumbs or single). Click -> `[slug]/[projectSlug]`.
- `Now` section: current focus (latest showcase pinned, editable in dashboard).
- `Previously` section: past roles / archived projects (from `status=archived` + manual bio lines in profile settings).

Components: `IndexHeader`, `IndexTabs`, `IndexProjectRow`, `NowSection`, `PreviouslySection`.

Settings must allow: edit `display_name`, `headline`, `slug` (with history + 301), site URL, `template` radio with live preview thumbnails, per-project `status`, `live_url`, `tags`, mockup device type.

OG: `app/[slug]/opengraph-image.tsx` uses `NEXT_PUBLIC_APP_URL`, avatar + name + top 3 project names. No hardcoded domain.

## 9. Hacker groups page

Route `app/hacker-groups/[groupSlug]/page.tsx`. Title always `Hacker groups` (plural in nav) / `{Group name}` heading. Never call it "groups" alone in UI.

Sections:

1. Header: group name, visibility badge (`Public`/`Private`), member count, `Copy invite link` (owner only) + `Add by GitHub username` input.
2. Leaderboard table/cards sorted by `activity_score` desc: rank #, avatar, display_name + `@{slug}`, `activity_score` integer, `pushes_7d`, `showcases_7d`, `Updated {TimeAgo}`. Highlight `you` row. Show `delta` arrow (▲/▼/– vs yesterday).
3. Peer activity feed: latest `showcases` + `push` events across members (via fan-out + polling).
4. Digests: weekly email + in-app `notifications` of standings; spike alerts when any member project jumps >=40% actives.

Empty: `No members yet — share the invite link.`

Access: public groups readable by anyone; private only members (RLS + middleware redirect to join page). Join via token link exchanges for membership row (validate `used_at` null or multi-use per group setting).

## 10. Logo / icon extraction (incl. mobile app icons)

On import + on webhook re-sync, server `github-sync` does in order, first hit wins, stores URL or downloaded file in Storage `logos/{project_id}`:

1. Explicit: repo root `logo.png|logo.svg|icon.png|icon.svg|app-icon.png`.
2. Web manifest: fetch `live_url` or README homepage link -> `manifest.json` -> largest `icons[].src`.
3. Favicon: `{live_url}/favicon.ico` + `<link rel=icon>` parse, upscale to 64px min.
4. Mobile (required): if repo contains mobile markers (`android/`, `ios/`, `app.json`, `expo.*`, `*.xcodeproj`, `AndroidManifest.xml`, `Info.plist`):
   - Android: `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (fallback `mipmap-xxhdpi`), or `AndroidManifest android:icon` target, or `expo.android.adaptiveIcon.foregroundImage`.
   - iOS: `ios/*/Images.xcassets/AppIcon.appiconset/180x180.png` (largest), or `Info.plist CFBundleIconFile`, or `expo.ios.icon`.
   - Expo/React Native: `app.json expo.icon`.
   - Flutter: `assets/icon/app_icon.png` or `pubspec flutter_icons`.
5. Fallback: GitHub org/user avatar, then initial-letter tile (deterministic hue from `github_repo_id`).

Cache resolved icon URL in `projects` (`icon_url` column — add to schema). Show in `ProjectRail`, story header, index rows, hacker group avatars. Re-resolve on `push` touching icon paths; otherwise keep cached. Unit test with fixture repos (web-only, expo, native android/ios).

## 11. Telemetry + tracker

`packages/tracker/tracker.ts` compiles to `tracker.js` (<1KB gzip assert in CI). Vanilla, no deps:

```html
<script defer src="{NEXT_PUBLIC_TRACKER_URL}" data-project="telemetry-slug"></script>
```

```tsx
import Script from "next/script";
export function PholioTracker({ slug }: { slug: string }) {
  return <Script src={process.env.NEXT_PUBLIC_TRACKER_URL} data-project={slug} strategy="afterInteractive" />;
}
```

Behavior: generate `session_hash` in memory + `sessionStorage` (no cookie), heartbeat every 30s + on visibilitychange, `sendBeacon POST {telemetry_slug, path} /api/ingest`, batch. Dedupe server-side by `(telemetry_slug, session_hash, 5min bucket)`.

Rollup cron (every 15min + daily): `raw_events` -> `daily_stats`. UI reads `daily_stats` only. Show `Visitors 7d`, `Actives 7d`, sparkline. Purge `raw_events > 30d`.

Privacy copy on snippet tab: `No cookies. No fingerprinting. Counts only.`

## 12. MCP + agent integration

Route `/api/mcp` Streamable HTTP. Auth `Authorization: Bearer PHOLIO_API_KEY_*` (constant-time compare against `key_hash`). Scopes `showcase:write` V1.

Tools (Zod in `packages/shared/mcpSchemas`):

| Tool | Args | Calls |
|---|---|---|
| `pholio_update_project` | `project_slug, summary?, tags?, live_url?, status?` | `projects/service.update` |
| `pholio_publish_showcase` | `project_slug, body(10..600 chars, 1–3 sentences)` | `showcases/service.publish` |
| `pholio_sync_readme` | `project_slug` | `github-sync/service.reparse` |
| `pholio_upload_mockup` | `project_slug, file_base64, device` | `mockups/service.upload` |
| `pholio_get_stats` | `project_slug, days=7` | `telemetry/service.getStats` |
| `pholio_get_leaderboard` | `group_slug?` | `leaderboard/service.get` |

Docs page `/docs/agent` renders MCP JSON using `NEXT_PUBLIC_APP_URL` (never hardcoded):

```json
{ "mcpServers": { "pholio": { "command": "npx", "args": ["-y", "@pholio/mcp-server"], "env": { "PHOLIO_API_KEY": "PHOLIO_API_KEY_*", "PHOLIO_BASE_URL": "{NEXT_PUBLIC_APP_URL}" } } } }
```

Master prompt (settings -> Copy): keep metadata current via `pholio_update_project`, post showcases on user-facing changes via `pholio_publish_showcase`, 1–3 plain sentences, no hype.

## 13. API routes (thin wrappers)

- `POST /api/ingest` (public, rate-limited 60/min/IP, validates telemetry_slug) -> insert raw_events.
- `GET /api/stats?project_slug&days=7` (public for showcase numbers, returns daily_stats rollup only).
- `POST /api/github/import` (auth) `{repo_full_names[]}`.
- `POST /api/github/resync` (auth) `{project_id}`.
- `POST /api/webhooks/github` (verify HMAC `GITHUB_WEBHOOK_SECRET`) -> enqueue reparse + draft showcase.
- `CRUD /api/showcases`, `/api/mockups` (auth, Zod, RLS).
- `CRUD /api/hacker-groups`, `POST /api/hacker-groups/join` (token).
- `GET /api/leaderboard?group_slug` (respects visibility).
- `/api/mcp` (API key, see §12).

All errors `{error: string}` + correct status. No stack traces to client.

## 14. Build order for coding agent (do in order, each green before next)

- Phase 0 Foundation: monorepo (`apps/web`, `workers/realtime`, `packages/*`), Next+Tailwind+shadcn init, `env.ts`, Supabase clients, marketing `/` with exact hero copy + `Join Pholio`/`Login`, healthcheck. Accept: `bun run dev`, `bun run check` green.
- Phase 1 Auth + showcase shell: GitHub OAuth only, auto-profile `{github_username}`, `[slug]` 404 + `slug_history` 301s, settings slug edit, template switcher stub. Accept: Join -> live `${APP_URL}/{you}`.
- Phase 2 GitHub import engine: Octokit list/import, README summary, §10 icon finder incl. mobile, webhooks + resync + daily cron. Accept: pick 3 -> cards with stars/language/Updated X ago + icons.
- Phase 3 Showcase templates: implement Variant A Story + Variant B Index per §8 pixel-close to mockups, `DeviceFrame`, `ProjectRail`, OG image. Accept: toggle template in settings changes public page; responsive 360px + 1280px.
- Phase 4 Mockups + showcases composer: Storage upload, device toggle, publish/edit, Now/Previously bindings. Accept: upload appears framed; publish appears in feed.
- Phase 5 Telemetry: tracker build + ingest + rollup + dashboard charts + verified badge. Accept: snippet E2E lights badge, 7d chart moves, bundle <1KB.
- Phase 6 Hacker groups + leaderboard: pages per §9, invites, scoring cron + snapshots, peer feed, Resend digests/spikes + in-app notifications. Accept: 2 users, push changes score/rank, emails sent.
- Phase 7 Realtime fan-out: `pg_net` triggers + Worker+DO + `useRealtimeChannel` + polling fallback. Accept: publish -> open page updates <5s; WS-killed still polls in 60s.
- Phase 8 MCP + docs/agent page. Accept: Cursor with key updates project + publishes showcase E2E.
- Phase 9 Hardening: RLS tests, ingest rate-limit, Playwright (join->import->showcase->group), a11y, banned-term grep must return zero hits (see Terminology rule at top).

Per `AGENTS.md`: after each domain change, run senior self-review (correctness, bugs, arch, quality, integration, security, perf, errors, consistency) before marking done. Commit small, lowercase imperative (`add hacker group leaderboard scoring`).

## 15. Non-goals V1

Chat button is visual only (no messaging backend). No custom domains. No email auth. No strict live presence counts. No tracker ingest on Workers (Phase 7+ optimization only).
