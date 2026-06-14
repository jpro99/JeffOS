# AGENTS.md — Jeff OS

Rules for agents editing `jeff-mission-control`.

## Build gate

```powershell
cd "C:\Projects\Project Command\jeff-mission-control"
npm run build
npm run lint
```

Run before telling Jeff to ship.

## Self-build

- Jeff may have `npm run dev` open on localhost:3000 while you edit.
- Verify build (Jeff OS UI) spawns another `npm run build` in this folder — usually OK.
- If `.next` conflicts, Jeff stops dev → verify → restart dev.

## Scope

- App code: `jeff-mission-control/src/`
- God Bot docs: `../AI-COMMAND-CENTER/projects/jeff-os.md`
- Do not confuse the two folders.

## Conventions

- Match existing Easy Mode component patterns.
- Minimal diff. No drive-by refactors.
- Caveman voice in user-facing copy when Jeff mode is caveman.

## Deploy (optional)

- **GitHub CI:** `.github/workflows/ci.yml` in this repo (JeffOS on GitHub).
- **Vercel:** import `github.com/jpro99/JeffOS`, **Root Directory** = `.`, framework Next.js.
