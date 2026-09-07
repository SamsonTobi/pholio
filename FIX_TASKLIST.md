# Pholio — Fix Tasklist (from production-readiness audit, Phases 0-7)

> Fix order: Critical first. Each item maps to audit finding. Verify with `bun run check` + `bun run test`.

## F1 Auth bypass + middleware (C1)
- [x] Remove `DEMO_USER_ID` fallback in all routes (401 if no user). Files: `api/hacker-groups/*`, `api/leaderboard`, `api/notifications`, `api/api-keys`, `api/github/import`, `api/agent-keys`.
- [x] Add auth to `api/github/resync`, `api/github/repos` (401, ownership check in `reparseProject(projectId,userId)`).
- [x] Middleware: redirect unauthed `/dashboard/*`, `/pick-repos` to `/login?next=`. Dashboard layout calls `requireUser()`.

## F2 RLS private-group leak (C2-C5)
- [x] Migration `032_hacker_rls_fix`: remove `OR true` on invites/snapshots, remove self-insert on members, add invite update/delete owner policies, scope snapshots/sync_events/showcases (owner-only or public-or-member), enable RLS on `realtime_outbox` (service-only).
- [x] Join via admin client only after token validation. Single-token lookup via `SECURITY DEFINER` fn.

## F3 Webhook + cron auth (C3,C6)
- [x] `verifySignature`: fail closed in prod, length-check before `timingSafeEqual`, wrap in try. Require `GITHUB_WEBHOOK_SECRET` in prod.
- [x] Idempotency via `x-github-delivery` unique constraint + `onConflict do nothing`. Return 200 fast, validate showcase body 10..600 (skip/pad short).
- [x] Cron route uses `timingSafeEqual`.

## F4 IDOR + scopes + tokens (C4,C5,C9)
- [x] `publishShowcase`: check `projects.owner_id==ownerId` -> 403. `updateProject(id,updates,ownerId)` filter by owner.
- [x] MCP handler: remove slug-as-ID fallback (404), enforce `showcase:write` per write tool, propagate upload errors (no fake success).
- [x] Invite tokens: `crypto.randomUUID()` / `randomBytes(32).base64url`. Allowlist `agent-keys` scopes.

## F5 XSS + DoS (C6)
- [x] Disallow SVG (PNG/JPEG/WebP only) or sandbox + `content-disposition`. Sniff magic bytes. Cap `file_base64.length>7MB` before decode. Cap `reorderMockups` items (max 50).

## F6 Open redirect (C7)
- [x] `auth/callback`: allow only `next` starting `/` not `//` no `:`. Same for login `next` passthrough + preserve `?next=`.

## F7 Showcase crash + dashboard mock + links (C8,C9)
- [x] `ShowcaseHeaderCard`: try/catch `new URL`, validate `https?`, fallback. Disable Chat (no `mailto:` guess) + `Coming soon` tooltip.
- [x] Dashboard pages: replace `INITIAL_*` mocks with real `/api/*` fetches, `revalidatePath`/`router.refresh()`. Fix `/tobi/*` -> `showcaseUrl()`. `IndexTabs`: derive `isOwner`, lift tab state to URL, fix nested Link.
- [x] `changeSlug`: append old slug to `slug_history` in same update.

## F8 Worker + realtime secrets (C10)
- [x] Remove `dev-secret` fallback in Worker + SQL. `500` if missing. `timingSafeEqual` compare. Add `[env.production]` vars, document `wrangler secret put`. Sign `/subscribe` or document public-channel limitation for private groups.

## F9 Crons + analytics + extensions + seed (C11)
- [x] Uncomment/enable `cron.schedule` for rollup-15min, purge-raw-daily, leaderboard-daily, outbox-purge-hourly, github-resync-daily (idempotent with unschedule guard). Fix extensions `with schema extensions`. Fix `visitors=count(distinct session_hash)` per day. Add `idx_raw_events_ts`. Fix seed FK/unique (local-only, fake slugs).

## F10 Important bundle
- [x] Rate-limit: use `request.ip`/Vercel/CF IP, shared-store note, return 503 on DB fail (not `ok:true`). Server throttle per session.
- [x] Txns: group create, join `used_at` CAS, pin singleton atomic, slug unique map `23505`->409.
- [x] N+1: single aggregate leaderboard query + pagination. Spike `already_notified_today`, handle 0->N, clamp future bonus.
- [x] Email: escape HTML, `from` via env, validate address.
- [x] Errors: generic 500, keep 4xx detail. No `err.message` leak.
- [x] Env: throw in prod on placeholder/missing Supabase keys. Remove `localhost` fallbacks in `TelemetrySnippetTab`, `DeviceFrame preview`, sender domains to env.
- [x] Storage: add logos update/delete, `with check`, project ownership check.
- [x] Realtime: `UPDATE OF (cols)` + `WHEN` delta guard, stable `owner_id` channel, targeted `invalidateQueries` (remove global `refetchInterval`, fix `StatPulse` batch).
- [x] Frontend: `next/image` (+ remotePatterns, lazy, sizes), defensive re-sort, archived links, derive year/joined/status, RSC `Promise.all`, OG `twitter:card` + canonical on deep page, fix `/onboarding`->`/pick-repos`, filter forks, fix date/decimal display, `DEMO_USER_ID` highlight -> session user.
- [x] A11y: buttons + `aria-expanded/label`, `htmlFor`, `aria-label` on overflow, table `aria-label` for delta.
- [x] Health: return `{ok:true}` only. Document CORS `*` + rotation guidance.

## F11 Phase 8 + 9 gaps
- [x] MCP: add `@modelcontextprotocol/sdk` or uncheck 8.5, add `PHOLIO_BASE_URL` or remove from plan, length caps, per-key rate-limit, `demo:true` flag (no silent demo, no `lagos-hackers` default).
- [x] Tracker: validate/truncate client-side, 60s heartbeat, document load model.
- [x] DO: hibernatable + `getWebSockets()`, payload shape validate, per-IP throttle.
- [x] Tests: RLS matrix, ingest 429, tracker size/privacy, Playwright flows, axe pass. Deploy checklist envs/redirects/CORS/cron/secrets/Resend.
