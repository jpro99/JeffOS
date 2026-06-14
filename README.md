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
2. **Self-build mode** banner — edit, verify, gaps, ship
3. **Rescan + verify build** — runs real `npm run build` on this repo

Code: this repo · Docs: `../AI-COMMAND-CENTER/` (sibling folder on Jeff's machine)

## GitHub

**Repo:** https://github.com/jpro99/JeffOS

```powershell
git remote -v   # should point at JeffOS
git push origin main
```

## CI

Workflow: `.github/workflows/ci.yml`

On every push to `main`: `npm ci` → `npm run build` → `npm run lint`

## Deploy (optional Vercel)

1. Vercel → **Import** → `jpro99/JeffOS`
2. **Root Directory:** `.` (repo root)
3. Framework: Next.js (auto from `vercel.json`)
4. Deploy — open **`https://your-app.vercel.app/easy`** on phone or any browser
5. Optional: **Add to Home Screen** (iPhone Share menu / Android Install app)

Optional env for custom domain:

```
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Local link:

```powershell
npx vercel link
```

## What you get

| Area | What |
|------|------|
| **Easy Mode** | Builder Hub, verify build, gap/fix prompts, ship panel |
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
