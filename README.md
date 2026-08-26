# Jeff OS

One app. One name. Everything lives here.

Project operating environment — status, next steps, errors, fixes, God Mode.

## Run Jeff OS

```powershell
cd "C:\Projects\Project Command\jeff-mission-control"
npm run dev
```

Open http://localhost:3000/easy/talk

Worldwide stack (one control plane, three engines):

| Where you are | What writes code | What answers small questions |
|---------------|------------------|------------------------------|
| Home PC (`C:\Projects`) | Local Cursor | **Ollama** on this machine — see `LOCAL.md` |
| Anywhere with a browser | [Cloud Agents](https://cursor.com/agents) | **Talk** on Vercel → Grok |
| Hotel / other office | Cloud Agent PR → `git pull` | Same Talk URL |

Cloud Agents are not a second chat app. They are remote computers that open PRs. They do not write to `C:\`. GitHub is the travel disk.

**Cursor is in charge** (all projects): paste the User Rule in [docs/CURSOR_IN_CHARGE.md](docs/CURSOR_IN_CHARGE.md). Short general questions may use home Ollama; code / demand facts stay on paid Cursor. Away from the desk needs Tailscale. No xAI key.

## What lives where

| Thing | Where |
|-------|--------|
| **Jeff OS** (the app) | This folder — `jeff-mission-control` |
| **Jeff OS docs** (God Bots, project index) | `docs/command-center/` inside this repo |
| **Your other apps** (Nurse Practitioner Study, etc.) | Their own folders on `C:\Projects\` — managed from **Projects** in Jeff OS |

The parent folder `C:\Projects\Project Command` is just a container on your PC. You only need **Jeff OS** day to day.

Legacy copy at `../AI-COMMAND-CENTER/` still works as fallback until you delete it.

## Self-build

1. Easy Mode → **Projects → Jeff OS**
2. Self-build banner → verify, gaps, ship
3. **Rescan + verify build** runs real `npm run build` on this repo

## GitHub

https://github.com/jpro99/JeffOS

```powershell
npm run push-live
```

## What you get

| Area | What |
|------|------|
| **Talk** | Grok + home Ollama + Cloud Agent routing. You set never-merge / never-guess |
| **Easy Mode** | Builder Hub, buttons, paste & fix, local terminal |
| **Project workspace** | Health, next action, Docs tab |
| **Docs tab** | Edit God Bot markdown in `docs/command-center/` |

---

Jeff OS v1. Caveman default.
