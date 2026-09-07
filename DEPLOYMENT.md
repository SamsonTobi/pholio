# Deployment Guide

This guide details the steps to deploy the Pholio monorepo to production.

## 1. Environment Variables Configuration

Set up the production environment variables in your deployment platform (e.g. Vercel) based on `.env.example`:

| Variable | Description | Example / Production Value |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Canonical public application URL | `https://your-domain.com` |
| `NEXT_PUBLIC_TRACKER_URL` | Hosted telemetry snippet URL | `https://your-domain.com/tracker.js` |
| `NEXT_PUBLIC_REALTIME_URL` | Cloudflare Worker WebSocket endpoint | `wss://realtime.your-domain.workers.dev` |
| `REALTIME_FANOUT_SECRET` | Shared secret between Supabase & Worker | Secure high-entropy random string |
| `SUPABASE_URL` | Supabase project URL | `https://[PROJECT-REF].supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | Supabase secret key for admin tasks | `sb_secret_...` |
| `SUPABASE_JWKS_URL` | Supabase JWT signing-key discovery URL | `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` |
| `SUPABASE_AUTH_CALLBACK_URL` | Supabase OAuth provider callback | `${SUPABASE_URL}/auth/v1/callback` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | GitHub Developer Settings |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | GitHub Developer Settings |
| `GITHUB_WEBHOOK_SECRET` | Secret for verifying GitHub webhooks | High-entropy random string |
| `CRON_SECRET` | Secret for protecting leaderboard cron API | High-entropy random string |
| `RESEND_API_KEY` | Resend API key for notification emails | `re_...` |

---

## 2. Supabase Setup & Migrations

1. **Apply SQL Migrations**:
   Run migrations in sequential order from `supabase/migrations/001_...` to `031_api_keys.sql` using Supabase CLI:
   ```bash
   supabase db push
   ```

2. **Enable Required Extensions**:
   In your Supabase project dashboard -> Database -> Extensions:
   - Enable `pg_cron`
   - Enable `pg_net`

3. **Storage Buckets & Policies**:
   Migrations automatically provision:
   - `logos`: Public read for extracted GitHub repository favicons and icons.
   - `mockups`: Public read with authenticated owner upload policies for showcase screenshots.

4. **Auth & OAuth Allowlist**:
   In Supabase dashboard -> Authentication -> URL Configuration:
   - **Site URL**: `${NEXT_PUBLIC_APP_URL}`
   - **Redirect URLs**:
     - `${NEXT_PUBLIC_APP_URL}/auth/callback`

---

## 3. GitHub OAuth Application & Webhooks

1. **OAuth App**:
   Create a GitHub OAuth Application under GitHub Settings -> Developer settings -> OAuth Apps:
   - **Homepage URL**: `${NEXT_PUBLIC_APP_URL}`
   - **Authorization callback URL**: `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`

2. **Webhooks**:
   For push and release synchronization:
   - **Payload URL**: `${NEXT_PUBLIC_APP_URL}/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: `${GITHUB_WEBHOOK_SECRET}`
   - **Events**: `push`, `release`

---

## 4. Cloudflare Worker Deployment (`workers/realtime`)

The WebSocket fanout server runs on Cloudflare Workers with Durable Objects:

1. Navigate to the worker directory:
   ```bash
   cd workers/realtime
   ```

2. Set required production secrets:
   ```bash
   wrangler secret put FANOUT_SECRET
   ```

3. Deploy to Cloudflare:
   ```bash
   wrangler deploy
   ```

4. Configure `NEXT_PUBLIC_REALTIME_URL` in Next.js to point to `wss://[worker-name].[subdomain].workers.dev`.

---

## 5. Web Application Deployment (Vercel)

1. Connect repository root to Vercel.
2. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web` (or root with monorepo build)
   - **Build Command**: `bun run build`
3. Add environment variables listed in Section 1.
4. Deploy!
