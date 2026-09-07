# Pholio — Fix Tasklist #2 (from production-readiness review #2)

> No `git checkout/reset` during fixes. Small commits, `bun run check` + tests green after each batch.

## G1 Critical — fabricated data + dead checks (C1,C2,C7)
- [x] G1.1 Showcase `publishShowcase`: rethrow `Forbidden`/not-found past the catch; demo fallback only when `!isSupabaseLive()`; real insert errors propagate (no fake 201).
- [x] G1.2 Telemetry `ingestEvent`: throw on DB error (route 503 live); remove success-path `mockRawEvents` push; `getStats` returns `demo:true` marker or empty stats (no silent fabrication); nonexistent slug → error/empty.
- [x] G1.3 Gate all service demo fallbacks behind `!isSupabaseLive()` AND empty-vs-error distinction: projects (no fake projects for 0-project users), profile `getBySlug`/`getById`, showcases, leaderboard snapshots, hacker-groups, notifications (never another user's rows).
- [x] G1.4 UI: remove `DEFAULT_NOTIFICATIONS`, demo api-keys, join-page fabricated invite + `lagos-hackers` default; honest error states everywhere (no fake success toasts).

## G2 Critical — 032-vs-code mismatch (C3)
- [x] G2.1 `joinGroupByToken` + invite preview read via `createAdminClient()` after token validation; member insert via admin; single-use `used_at` CAS; surface real errors (no fake success).
- [x] G2.2 Peer feed + member push-count aggregation via admin client (cross-user reads RLS can't do).

## G3 Critical — MCP RLS (C4) + scopes (I9)
- [x] G3.1 Services used by MCP (`updateProject`, `publishShowcase`, `reparseProject`, `uploadMockup`, `getStats`, `getLeaderboardSnapshot`) work with admin client + explicit owner checks so key-based (cookieless) calls succeed; user-session callers keep same behavior.
- [x] G3.2 Enforce `stats:read` for `get_stats`, `leaderboard:read` for `get_leaderboard` (or document all-scopes keys — pick enforcement).

## G4 Critical — realtime payloads (C5) + tokens (C6)
- [x] G4.1 Migration 034: add `id` to daily_stats + leaderboard fanout payloads (match DO validation).
- [x] G4.2 Invite tokens `crypto.randomUUID()`; telemetry slug keeps randomUUID.

## G5 Registrations/history/duplicates
- [x] G5.1 `changeSlug` appends old slug to `slug_history` atomically-ish + maps 23505→taken.
- [x] G5.2 `importRepos`: exclude `telemetry_slug` from upsert; draft insert only if no github-source showcase exists.
- [x] G5.3 `createGroup` transactional-ish (cleanup group if member insert fails); `createInvite`/`createNotification` propagate insert errors; duplicate slug → 409.

## G6 Leaderboard quality (I3)
- [x] G6.1 Batch aggregation (single queries per metric, no 3N); paginate members.
- [x] G6.2 Spike `already_notified_today` dedup; 0→N fires; growth clamp; future-timestamp clamp (verify scoring.ts); compute+notify only from cron path, GET serves snapshot (no sync compute+fanout on read).

## G7 Email pipeline (I6)
- [x] G7.1 `getUserEmail(userId)` via admin `getUserById`; send spike emails from cron path + invite emails on invite creation, guarded by `RESEND_API_KEY`; failures logged, never thrown. Consolidate `RESEND_FROM` on `env.ts`.

## G8 DB follow-ups (review #2 DB audit)
- [x] G8.1 Migration 034: `WHEN (old.* IS DISTINCT FROM new.*)` on fanout triggers + `UPDATE OF` cols; upsert `WHERE ... IS DISTINCT FROM excluded` on rollup; dynamic `net` vs `extensions.net` resolution in `notify_fanout`; `coalesce(app_url,'')` skip; drop redundant `idx_sync_events_delivery`.
- [x] G8.2 Seed FK: seed `auth.users` rows first (local-only) or document `db reset` procedure.
- [x] G8.3 Regen `types.ts` (delivery_id, realtime_outbox) or record drift.
- [x] G8.4 `handle_new_user`: guard provider_id cast + slug-race retry note.

## G9 Frontend honesty + UX (review #2 frontend audit)
- [x] G9.1 Group page: owner-only invite UI (`user_role==='owner'`); real copy/invite/request flows with `res.ok` checks + error UI (no fabricated links/toasts).
- [x] G9.2 Login: surface `?error=auth-failed` with `role=alert`; keep safe `next`; disclose `repo` scope.
- [x] G9.3 StatusPill: map active→`Shipped` green, archived→muted (no raw lowercase).
- [x] G9.4 Story sections link to deep pages; archived clickable; deep page honors `canonicalSlug` 301.
- [x] G9.5 Group poll: background refetch (no full-skeleton flash).
- [x] G9.6 Remove demo persona defaults (headline/tagline fallbacks → null/empty); remove dead `INITIAL_GROUPS`; remove `lagos-hackers` placeholder text; `requireUser` keeps `?next`.
- [x] G9.7 Optimistic mockup/showcase ops revert + surface errors; `refreshShowcases` checks `res.ok`.
- [x] G9.8 `docs/agent` → RSC + client copy island; remove marketing-fabrication note (keep required copy as-is per plan); fix `py-0.2`, peer avatars next/image, telemetry copy-button failure states.

## G10 MCP packaging + tests honesty (review #2 worker/MCP audit)
- [x] G10.1 `packages/mcp-server`: add `exports` field, fix `src/index.test.ts` (test what exists), fix bin (build step or bun run), add bun-types or drop `types:["bun"]`, add SDK dep or record hand-rolled decision; fix stale handler NOTE.
- [x] G10.2 Correct error code for missing group_slug (`-32602`); cap JSON-RPC batch length; move `/api/mcp` body parse after auth or cap size; document CORS `*` + rotation.
- [x] G10.3 `rls.test.ts`: replace tautologies with documented live-DB integration test (skipped without env) — no fake-green unit.
- [x] G10.4 Cap growth %, fix telemetry invalidate key (`[slug,7]`), map `Forbidden`→403 in projects PATCH route, fix upload mime param (accept png/jpeg, reject svg explicitly), `getProjectById` no demo default.

## G11 Verify
- [x] `bun run check` green, 151+ tests green, banned-term clean, tracker in sync + <1KB.
- [x] Re-audit (agents) + final report.
