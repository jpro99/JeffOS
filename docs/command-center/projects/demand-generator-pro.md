# DEMAND GENERATOR PRO — GOD BOT

Project God Bot for **Demand Letter Generator** (legal demand letters + doc AI).

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| **Repo path (use this)** | `C:\vercel generator` |
| Alt path | `C:\Projects\demand-generator-pro-temp` — duplicate clone, same GitHub repo |
| GitHub | https://github.com/jpro99/Demand-Generator-Pro |
| npm name | `demand-letter-frontend` |
| Maturity | **active** |
| Priority | **P1** |
| Stack | Next 16, React 19, TS, Postgres, NextAuth (Google), Vercel Blob, Gemini/Vertex/OpenAI, pdf-parse, pdf-lib, docx, optional ClamAV Docker |
| Purpose | Legal demand letter generator — matters, document upload, medical bills, AI extraction, letter preview/edit |

## Voice

Caveman. Security-aware (legal docs).

## Boot sequence

1. Read `README.md`
2. Read **`AGENTS.md`** — mandatory (ports, DB bootstrap, migrations)
3. Read `docs/security-hardening-roadmap.md` if security task
4. Read this file

## Architecture snapshot

- Next App Router — `/matters` is home (redirect from `/`)
- Postgres: matters, documents, medical_bills, matter_documents
- Migrations in `database/migrations/` — **order quirks documented in AGENTS.md**
- Optional: file watcher, ClamAV scanner service, golden extraction scripts
- Admin panel: password separate from Google OAuth

## Dev commands

| Task | Command |
|------|---------|
| Install | `npm install` |
| Dev | `npm run dev` → **http://localhost:3001** |
| Build | `npm run build` |
| Start prod | `npm run start` |
| Golden extraction | `npm run golden-extraction` |
| Virus scan stack | `docker compose up -d` |

**No `npm run lint`** — build runs TS check

## Env / secrets (`.env.local`)

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Required |
| `NEXTAUTH_URL` | `http://localhost:3001` |
| `NEXTAUTH_SECRET` | OAuth |
| `GOOGLE_CLIENT_ID/SECRET` | Staff login |
| `ADMIN_PANEL_PASSWORD` | `/admin` |
| `BLOB_READ_WRITE_TOKEN` | Uploads |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | AI |

Fresh DB needs bootstrap before migrations (see AGENTS.md).

## Gotchas

- README says 3000 — app uses **3001**
- Migration `20260512` vs `20260513` order issue — read AGENTS.md
- Folder name `-temp` — may rename later

## Bot strategy

| Task | Worker |
|------|--------|
| PDF/extraction | PDF Worker |
| AI prompts | AI Worker |
| Auth/admin | Security Worker |
| New letter UI | Feature Worker |
| Deploy | Deploy Worker — see `docs/local-test-server.md` |

## Scope rules

- Legal data — no logging PII
- Follow security roadmap for hardening tasks
- Minimal diffs

## Hand back to Control Tower

If merging with other legal products or renaming repo.
