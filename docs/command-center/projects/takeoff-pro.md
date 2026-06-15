# TAKEOFF PRO — GOD BOT

Project God Bot for **Takeoff Pro** (contractor takeoff & estimating).

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| Repo path | `C:\Projects\Contractor take off estimator` |
| npm name | `contractor-takeoff-estimator` |
| Maturity | **active** — Stage 1 done |
| Priority | **P0** |
| Stack | Next 15 (App Router, Turbopack), TS, Tailwind 4, shadcn/Base UI, Supabase Auth+Storage, Prisma 7 + pg adapter, TanStack Query, PDF.js, Vitest |
| Purpose | Contractor plan takeoff, PDF sheets, org/project model, estimating roadmap |

## Voice

Caveman. Stage-aware — don't build Stage 4 when Stage 2 needed.

## Boot sequence

1. Read `README.md`
2. Read `docs/SETUP-SUPABASE.md` for env/DB
3. Read `.env.example`
4. Read this file

## Architecture snapshot

- Single Next app — authenticated shell, project CRUD
- PDF upload → Supabase storage → `plan_sheets` per page
- In-browser PDF viewer per sheet (zoom, watermark, calibration placeholder)
- Left nav has Stage 2–5 roadmap placeholders
- Prisma schema: org, project, plan set, pricing book

## Dev commands

| Task | Command |
|------|---------|
| Install | `npm install` |
| Local setup | `npm run setup:local` (Docker Supabase + migrate + seed) |
| Dev | `npm run dev` |
| Build | `npm run build` |
| Test | `npm run test` |
| Lint | `npm run lint` |
| Supabase status | `npm run supabase:status` |

**Requires:** Node 20+, Docker Desktop for local Supabase

## Env / secrets

Copy `.env.example` → `.env` or use `.env.local` from `setup:local`

Flags like `SUPABASE_AUTH_BYPASS` — dev only, never prod

## Roadmap (from README)

- **Stage 1:** ✅ schema, auth shell, PDF upload/view
- **Next:** calibration, OCR/scale, takeoff tools, flooring pricing, proposal PDF, AI suggestions

## Gotchas

- Path has spaces — quote in PowerShell
- Create Auth user in Supabase Studio after `setup:local`
- Staging shell lives elsewhere: `contractor-takeoff-staging` — not this repo

## Bot strategy

| Task | Worker |
|------|--------|
| PDF viewer/calibration | Feature Worker |
| Prisma/Supabase | Fix Worker + read SETUP doc |
| Pricing engine | Feature Worker — big scope, phase it |
| Deploy | Deploy Worker |

## Scope rules

- Follow staged roadmap unless Jeff reprioritizes
- Don't skip Supabase setup steps
- Match existing UI patterns (shadcn/Base UI)

## Related

- `C:\Projects\contractor-takeoff-staging` — bare Next scaffold for spikes only
