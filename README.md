# Jeff OS

Project operating environment for Jeff — status, next steps, errors, security, God Mode.

**v1 Mission Control** — local-first. Cursor = home base. Routes best interface, bot, model per task.

## Run

```powershell
cd "C:\Projects\Project Command\jeff-mission-control"
npm run dev
```

Open http://localhost:3000

## Self-build (dogfood)

Jeff OS can manage itself:

1. Easy Mode → **Projects → Jeff OS**
2. **Self-build mode** banner — edit code, verify, gaps, ship
3. **Rescan + verify build** — runs real `npm run build` on this repo

Code: `jeff-mission-control/` · Docs: `AI-COMMAND-CENTER/`

## Deploy (optional)

### GitHub CI

Workflow at repo root: `.github/workflows/jeff-os-ci.yml` (Project Command git repo).

Runs `npm ci`, `npm run build`, `npm run lint` in `jeff-mission-control/`.

### Vercel

1. Connect GitHub repo (Project Command)
2. **Root Directory:** `jeff-mission-control`
3. Framework: Next.js (auto)
4. `vercel.json` included

Or local link:

```powershell
cd "C:\Projects\Project Command\jeff-mission-control"
npx vercel link
```

## What you get

| Area | What |
|------|------|
| **Easy Mode** | Snapshot, verify build, gap/fix prompts, ship panel |
| **Project workspace** | Operating room per project — health, next action, errors |
| **Command Center tab** | Edit God Bot markdown in `AI-COMMAND-CENTER` |
| **Voice control** | Push/tap to talk — routes commands |

## Pages

Home · Easy Mode · Projects · Classic workspace · Bots · Tasks · Settings

## Data

`localStorage` key: `jeff-mission-control-v9`

Links to `AI-COMMAND-CENTER/` for God Bot prompt paths.

---

Jeff OS v1. Caveman default. Operator-grade calm.
