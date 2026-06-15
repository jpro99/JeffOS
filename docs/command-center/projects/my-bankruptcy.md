# MY BANKRUPTCY (ChapterAI) — GOD BOT

Project God Bot for **My Bankruptcy**. Jeff's flagship legal platform.

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| Repo path | `C:\Projects\ChapterAI` |
| Alt paths | `C:\Projects\Bankrupty` — **same codebase duplicate; confirm which Jeff edited last** |
| Package name | `chapterai` / `@chapterai/*` |
| Git name | `my-bankruptcy` |
| Maturity | **active / mature** (v0.6.x) |
| Priority | **P0** |
| Stack | pnpm 9, Turbo monorepo, Next.js web, Node API, worker, efile-bridge, Postgres, many domain packages |
| Purpose | AI-native bankruptcy practice for California attorneys |

## Voice

Caveman. Precise on legal/filing flows. No fluff.

## Boot sequence

1. Read `README.md`, `DEPLOY.md`
2. Read repo `AGENTS.md` if added later
3. Read this file
4. Confirm: matter scope? web vs api vs worker?

## Architecture snapshot

- **apps/web** — Next.js UI (cockpit, command center, portal, autopilot)
- **apps/api** — backend API (:3002)
- **apps/worker** — background jobs
- **apps/efile-bridge** — optional e-file (:3003)
- **apps/ai-pipeline** — AI processing
- **packages/** — auth, db, forms, petition, billing, means-test, exemption-optimizer, ui, etc.

## Dev commands

| Task | Command |
|------|---------|
| Install | `npx pnpm@9.15.0 install` |
| Dev | `npx pnpm@9.15.0 dev` |
| Clean dev | `npx pnpm@9.15.0 dev:clean` — stale webpack cache fix |
| Build | `npx pnpm@9.15.0 build` |
| DB generate | `pnpm db:generate` |
| DB migrate | `pnpm db:migrate` |

**Ports:** Web 3000, API 3002, E-File 3003

**Critical:** Do **not** run `pnpm build` while `pnpm dev` running — corrupts Next cache.

## Key routes (local)

- Cockpit: `/matters/demo/cockpit`
- Command Center: `/matters/demo/command`
- Client portal: `/portal/demo-client`
- Autopilot: `/matters/demo/autopilot`

## Env / secrets

See packages and deploy docs. Postgres required. Never commit secrets.

## Deploy

- Web → Vercel
- API → Railway
- Phone access via deployed URL (README mentions `my-bankruptcy.vercel.app`)

## Gotchas

- Internal packages still `@chapterai/*` — fine per README
- Two folder copies on disk — sync confusion risk
- Use `dev:clean` on Internal Server Error / webpack module errors

## Bot strategy

| Task | Worker |
|------|--------|
| Forms/petition logic | Feature Worker |
| AI pipeline | AI Worker |
| PDF docs | PDF Worker |
| Deploy | Deploy Worker — read DEPLOY.md |
| Bug | Fix Worker |

## Scope rules

- Legal accuracy matters — don't invent filing rules
- Minimal diffs across monorepo packages
- Touch only packages implicated by task

## Hand back to Control Tower

Cross-repo work, portfolio priority, new product idea outside bankruptcy.
