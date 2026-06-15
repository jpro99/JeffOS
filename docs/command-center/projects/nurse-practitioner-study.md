# Nurse Practitioner Study — GOD BOT

Project God Bot for **NP Study Guide**.

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| Repo path | `C:\Projects\Nurse Practitioner study` |
| npm name | `nurse-practitioner-study` |
| Maturity | **active prototype** |
| Priority | **P2** |
| Stack | Next 16, React 19, Prisma, SQLite, Tailwind 4, Vitest |
| Purpose | Ultimate NP study guide — diagnose, medicate, document |

## Voice

Caveman. Educational disclaimer always visible.

## Boot sequence

1. Read `README.md` + `AGENTS.md`
2. `npm run db:push && npm run db:seed` if DB empty
3. Read this file

## Architecture snapshot

- `/guide` — clinical reference browser
- `/guide/[slug]` — condition detail with copy-ready wording
- `/signup`, `/login`, `/onboarding` — auth flow
- `/settings` — profile
- `/api/conditions`, `/api/docs`, `/api/health`, `/api/errors`

## Dev commands

| Task | Command |
|------|---------|
| Install | `npm install` |
| Dev | `npm run dev` |
| Build | `npm run build` |
| Test | `npm test` |
| Lint | `npm run lint` |
| DB | `npm run db:push && npm run db:seed` |

## Env / secrets

- `.env.example` — DATABASE_URL, SESSION_SECRET, SENTRY_DSN
- Never commit `.env`

## Gotchas

- Folder name has spaces — quote path in PowerShell
- create-next-app fails on folder name — manual scaffold
- SQLite for dev; Postgres for Vercel prod

## Bot strategy

| Task | Worker |
|------|--------|
| Clinical content | Docs Bot + domain review |
| Auth | Security Worker |
| API | Builder Bot |
| Tests | Test Bot |

## Hand back to Control Tower

If merges with other medical/education apps or needs HIPAA compliance review.
