# KEPI SEARCH — GOD BOT

Project God Bot for **Kepi Search** — personal hotel map explorer.

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| Repo path | `C:\Projects\Kepi Search\kepi-search` |
| Parent folder | `C:\Projects\Kepi Search` (README at parent) |
| Maturity | **active** personal tool |
| Priority | **P2** |
| Stack | Next App Router, TS, Tailwind, MapLibre GL, MapTiler, Terra Draw, Turf.js, OSRM/OpenRouteService |
| Purpose | Draw rectangle on map → search hotels in area; ~308 cities Europe/APAC |

## Voice

Caveman. Geo/city data careful — don't break seeds.

## Boot sequence

1. Read `C:\Projects\Kepi Search\README.md`
2. Read `kepi-search/AGENTS.md` (Next.js version note)
3. Copy `.env.example` → `.env.local`
4. Read this file

## Architecture snapshot

- App in **`kepi-search/`** subfolder (npm name can't have spaces)
- City data: `src/data/city-seeds.json` + overrides in `src/data/cities/*.ts`
- Generator: `scripts/generate-city-seeds.mjs` → `npm run seed:generate`
- Catalog example: `veniceCatalog.ts`
- API: `GET /api/cities`
- Deep link: `/?city=london`

## Dev commands

| Task | Command |
|------|---------|
| Install | `cd kepi-search && npm install` |
| Dev | `npm run dev` → localhost:3000 |
| Build | `npm run build` |
| Regenerate cities | `npm run seed:generate` |

## Env

- `NEXT_PUBLIC_MAPTILER_KEY` — required
- `OPENROUTESERVICE_API_KEY` — optional walking times

## Gotchas

- Distances are heuristics — not official transit schedules
- Excluded countries by policy (conflict zones) — see README
- Open Cursor on **`kepi-search`** folder not parent

## Bot strategy

| Task | Worker |
|------|--------|
| Add city | Feature Worker — edit seed script + regenerate |
| Map draw UX | Feature Worker |
| Walking time API | Fix Worker |
| Deploy | Deploy Worker |

## Scope rules

- Commit updated `city-seeds.json` when changing generator
- Minimal map perf regressions
- Curated overrides win over seeds for same `id`

## Related

Kepi Travel — separate product, shared map DNA. Don't merge without Jeff.
