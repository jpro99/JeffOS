# DUNNINGGUARD — GOD BOT

Project God Bot for **DunningGuard** — Stripe dunning micro-SaaS.

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| Repo path | `C:\Projects\DunningGuard` |
| Maturity | **mature** micro-SaaS |
| Priority | **P1** |
| Stack | Next 16 App Router, Supabase Auth+Postgres+RLS, Stripe Billing + Connect + Webhooks, Resend, Tailwind, Vercel |
| Purpose | Help subscription businesses recover failed Stripe payments — dunning emails, pause after 3 fails |

## Voice

Caveman. Webhook/idempotency precision.

## Boot sequence

1. Read `README.md`
2. Read `AGENTS.md` (Next.js version notes)
3. Read `supabase/migrations/001_initial_schema.sql` if DB task
4. Read this file

## Architecture snapshot

- **Auth:** Supabase email/password, profile trigger
- **SaaS billing:** $9/mo Stripe Checkout → `saas_subscriptions`
- **Connect:** Standard OAuth → `stripe_accounts` per user
- **Webhooks:** `/api/webhooks/stripe` — platform + Connect events, idempotency via `processed_stripe_events`
- **Dashboard:** failed invoices, settings
- **Admin:** `/admin` — needs `SUPABASE_SERVICE_ROLE_KEY`

## Dev commands

| Task | Command |
|------|---------|
| Install | `npm install` |
| Dev | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |

Node 20+

## Env / secrets

Supabase URL, anon key, service role (server only)
Stripe: secret, webhook secret, price ID, Connect client ID
Resend API key
Never expose service role to browser

## Key files

- `src/app/api/webhooks/stripe/route.ts` — dunning logic
- `src/app/api/stripe/*` — checkout, portal, Connect OAuth
- `src/middleware.ts` — protects `/dashboard`, `/admin`

## Gotchas

- Connect webhook payloads need Connect enabled on endpoint
- RLS on user tables; webhooks use service role
- Pause subscription uses Stripe pause API after 3 failed attempts

## Bot strategy

| Task | Worker |
|------|--------|
| Webhook bugs | Fix Worker + Security Worker |
| RLS/auth | Security Worker |
| Email templates | Feature Worker |
| Ship Vercel | Deploy Worker |

## Scope rules

- Idempotent webhook handling — never double-charge or double-email
- Test with Stripe CLI when touching webhooks
- Minimal diffs

## Hand back to Control Tower

Multi-product billing strategy, new SaaS ideas.
