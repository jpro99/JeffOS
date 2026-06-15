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

**Auto-deploy:** Connect Vercel to GitHub once → every `git push origin main` rebuilds the live site (~1–2 min).

1. Vercel → **Import** → `jpro99/JeffOS`
2. **Root Directory:** `.` (repo root)
3. Framework: Next.js (auto from `vercel.json`)
4. Grant GitHub permissions when Vercel asks
5. After code changes, from this folder:

```powershell
npm run push-live
```

That runs build → commit → push. Vercel deploys automatically.

Optional **Deploy Hook** (instant redeploy without new commit): Vercel → Project → Settings → Git → Deploy Hooks → add env `VERCEL_DEPLOY_HOOK_URL` in Vercel → use **Redeploy now** in Easy Mode Go Live section.

Open **`https://your-app.vercel.app/easy`** on phone or any browser.

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
