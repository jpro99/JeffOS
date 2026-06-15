# JEFF OS — GOD BOT

Project God Bot for **Jeff OS** (Jeff Mission Control) — the dashboard that runs Command Center.

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| **Primary path** | `C:\Projects\Project Command\jeff-mission-control` |
| Docs path | `C:\Projects\Project Command\AI-COMMAND-CENTER` |
| Maturity | **active** — dogfooding |
| Priority | **P0** — meta tool for all other projects |
| Stack | Next.js 16, React 19, TypeScript, Tailwind 4, localStorage state |
| Purpose | Easy Mode + Classic Mission Control — scan, verify build, gap/fix prompts, ship prompts |

## Voice

Caveman. Short. Ship small diffs.

## Boot sequence

1. Confirm path: `jeff-mission-control` (app) vs `AI-COMMAND-CENTER` (markdown docs only)
2. Read `package.json` scripts
3. Read `CONTROL_TOWER.md` + `PROJECT_INDEX.md`
4. Read this file

## Dev commands

| Task | Command | Where |
|------|---------|-------|
| Dev server | `npm run dev` | `jeff-mission-control` → http://localhost:3000 |
| Production build | `npm run build` | same folder |
| Lint | `npm run lint` | same folder |

## Self-build rules

- **You are editing the app Jeff is using.** Save files → hot reload in browser.
- **Rescan + verify build** spawns `npm run build` in this repo. If dev is running, build usually still works — if `.next` fights, stop dev, build, restart dev.
- **Do not verify other projects while only this dev server runs** — scan API runs on this same Node process.
- God Bot markdown lives in `AI-COMMAND-CENTER/projects/` — app code lives in `jeff-mission-control/src/`.

## Architecture snapshot

- `src/app/easy/` — Easy Mode UI
- `src/lib/project-scan/` — folder scan, verify build, reconcile gaps
- `src/lib/mission/` — fix/gap/ship prompt bundles
- `src/lib/store/` — localStorage persistence (`jeff-mission-control-v9+`)
- `src/app/api/projects/scan-brief` — scan + optional verify

## Deploy (optional)

| Step | Action |
|------|--------|
| CI | `.github/workflows/jeff-os-ci.yml` at Project Command repo root |
| Vercel | Import repo → Root Directory = `jeff-mission-control` |
| Local link | `npx vercel link` in app folder |

## Gotchas

- Jeff OS was intentionally hidden from project list (meta workspace) — now listed as **Jeff OS**.
- Stale seed ops can lie about gaps — use **Rescan + verify build** for truth.
- Command Center tab edits markdown; Easy Mode edits how Jeff sees all projects.

## Bot strategy

| Task | Worker |
|------|--------|
| UI / Easy Mode | Builder Bot |
| Verify / scan logic | Debug Bot + Test Bot |
| Types / store | Architect Bot |
| Docs / God Bots | Docs Bot |

## Hand back to Control Tower

Jeff wants Jeff OS to dogfood itself — build features here, verify here, ship when green.
