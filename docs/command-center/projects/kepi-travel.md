# KEPI TRAVEL — GOD BOT

Project God Bot for **Kepi Travel** — travel assistant platform.

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| **Primary path** | `C:\Projects\Kepi Travel\kepi-travel-reborn` |
| Alt paths | `kepi-travel`, `kepi-travel-rebuilt` |
| Maturity | **active** — large codebase + tests |
| Priority | **P1** |
| Stack | Next, MapTiler/MapLibre, Clerk auth, Upstash Redis, Stripe, Capacitor (mobile), Anthropic, Inngest, Sentry, Turf, Playwright/Jest |
| Purpose | Travel assistant — trips, maps, ops control, notifications, share, offline outbox, incident flows |

## Voice

Caveman. **Build before push** — Vercel failures cost money.

## Boot sequence

1. Confirm which fork Jeff wants (**default: kepi-travel-reborn**)
2. Read sibling `kepi-travel/AGENTS.md` for engineering rules (build gate, generateId, Redis lazy init)
3. Read `package.json` scripts
4. Read this file

## Architecture snapshot

- **kepi-travel-reborn:** richest — travel assistant modules under `src/lib/travelAssistant/`, extensive tests, map worker patches, city seeds
- **kepi-travel-rebuilt:** Next 16, maplibre-gl, Inngest, googleapis — alternate line
- **kepi-travel:** older; has detailed AGENTS.md rules

Shared concerns: maps, trip store, ops APIs, mobile Capacitor hooks

## Dev commands (kepi-travel-reborn)

| Task | Command |
|------|---------|
| Install | `npm install` (runs postinstall patches) |
| Dev | `npm run dev` |
| Build | `npm run build` — **required before push** |
| Lint | `npm run lint` |
| Unit tests | `npm run test:adapters` |
| E2E | `npm run test:e2e` / `app-sitter` |

## Engineering rules (from kepi-travel AGENTS)

- **RULE ZERO:** `npm run build` clean before GitHub push
- Use `@/lib/utils/generateId` — never raw `crypto.randomUUID()`
- Redis/KV: lazy init only, fail safe
- Read Next breaking-change docs in `node_modules/next/dist/docs/` before framework edits

## Env / secrets

MapTiler, Clerk, Upstash, Stripe, Anthropic, Sentry — see `.env.example` in active fork

## Gotchas

- Three folders — easy to edit wrong repo
- postinstall patches maplibre worker — don't skip install
- Failed Vercel deploy = real cost — build locally first

## Bot strategy

| Task | Worker |
|------|--------|
| Map/UI bug | Fix Worker — build after |
| Travel assistant logic | Feature Worker |
| Ops/webhooks | Security Worker |
| Mobile Capacitor | Feature Worker — test device |
| Deploy | Deploy Worker — build gate |

## Scope rules

- Minimal targeted edits
- Run lint + build before done
- Confirm fork before first file edit

## Hand back to Control Tower

Jeff wants to consolidate forks or pick single canonical repo.
