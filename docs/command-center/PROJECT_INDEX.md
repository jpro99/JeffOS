# PROJECT INDEX

Jeff's software map. Scanned `C:\Projects\` on **2026-06-14**.

Control Tower reads this first. Update when paths/priorities change.

---

## Summary

| # | Project | Path | Stack | Maturity | Priority |
|---|---------|------|-------|----------|----------|
| 1 | My Bankruptcy | `C:\Projects\ChapterAI` | pnpm monorepo, Next.js, Turbo, Postgres | **active / mature** | **P0** |
| 2 | Takeoff Pro | `C:\Projects\Contractor take off estimator` | Next 15, Prisma 7, Supabase, PDF.js | **active** | **P0** |
| 3 | Demand Generator Pro | `C:\vercel generator` *(Vercel copy)* | Next 16, Postgres, PDF/AI | **active** | **P1** |
| 4 | DunningGuard | `C:\Projects\DunningGuard` | Next 16, Supabase, Stripe Connect | **mature** | **P1** |
| 5 | Kepi Travel | `C:\Projects\Kepi Travel\kepi-travel-reborn` | Next, MapLibre, Clerk, Redis, Capacitor | **active** | **P1** |
| 6 | Kepi Search | `C:\Projects\Kepi Search\kepi-search` | Next, MapLibre, Turf | **active** | **P2** |
| 7 | All In One Edgar | `C:\Projects\All In One Edgar` | .NET, Docker, NAS deploy | **active** | **P2** |
| 8 | Home Compass | `C:\Projects\household-compass` | Next 15, Supabase | **active / prototype+** | **P2** |
| 9 | Language Translator | `C:\Projects\language app` | Vite, React PWA | **prototype** | **P3** |
| 10 | Story Pals | `C:\Projects\Story Pals` | Flutter | **prototype** | **P3** |
| 11 | Contractor Takeoff Staging | `C:\Projects\contractor-takeoff-staging` | Next 15 scaffold | **staging shell** | **P3** |

### Not indexed (intentional)

| Path | Why skipped |
|------|-------------|
| `C:\Projects\Bankrupty` | Duplicate of ChapterAI — same `my-bankruptcy` codebase |
| `C:\Projects\demand-generator-pro-temp` | Duplicate of `C:\vercel generator` — same GitHub repo, same commit |
| `C:\Projects\Project Command` | Meta workspace — hosts this Command Center |
| `C:\Projects\face_body_lotion` | Empty folder |
| `C:\Projects\test` | Empty folder |

---

## Project details

### 1. My Bankruptcy (ChapterAI)

| Field | Value |
|-------|-------|
| **Name** | My Bankruptcy / ChapterAI |
| **Path** | `C:\Projects\ChapterAI` |
| **Alt path** | `C:\Projects\Bankrupty` (duplicate — confirm before edit) |
| **Stack** | pnpm 9, Turbo, Next.js web, API, worker, efile-bridge, `@chapterai/*` packages, Postgres |
| **Purpose** | AI-native bankruptcy practice platform for California attorneys |
| **Maturity** | Active, v0.6.x territory, production-minded |
| **Priority** | **P0** — flagship legal product |
| **Bot strategy** | God Bot + Feature/AI workers; read repo README + DEPLOY.md; never run `build` during `dev` |
| **God Bot** | `projects/my-bankruptcy.md` |
| **Key URLs (local)** | Web :3000, API :3002, Command Center `/matters/demo/command` |

---

### 2. Takeoff Pro

| Field | Value |
|-------|-------|
| **Name** | Takeoff Pro (contractor-takeoff-estimator) |
| **Path** | `C:\Projects\Contractor take off estimator` |
| **Stack** | Next 15, TypeScript, Tailwind 4, shadcn/Base UI, Supabase Auth/Storage, Prisma 7 + pg, TanStack Query, PDF.js |
| **Purpose** | Contractor plan takeoff & estimating — Stage 1: PDF upload, sheets, viewer, org/project model |
| **Maturity** | Active Stage 1 shipped; roadmap Stages 2–5 |
| **Priority** | **P0** — major product build |
| **Bot strategy** | God Bot + Feature Worker; follow `docs/SETUP-SUPABASE.md`; Docker for local Supabase |
| **God Bot** | `projects/takeoff-pro.md` |
| **Related** | `contractor-takeoff-staging` = empty Next shell for experiments |

---

### 3. Demand Generator Pro

| Field | Value |
|-------|-------|
| **Name** | Demand Letter Generator |
| **Path (Vercel / primary)** | `C:\vercel generator` |
| **Alt path** | `C:\Projects\demand-generator-pro-temp` — same repo, duplicate clone |
| **GitHub** | https://github.com/jpro99/Demand-Generator-Pro (also `demand-generator-pro`) |
| **Stack** | Next 16, React 19, TS, Postgres, NextAuth, Vercel Blob, Gemini/OpenAI, PDF parse |
| **Purpose** | Legal demand letter generator — matters, docs, medical bills, AI extraction |
| **Maturity** | Active |
| **Priority** | **P1** |
| **Bot strategy** | God Bot + PDF Worker + AI Worker; read `AGENTS.md` (port **3001**, migration order quirks) |
| **God Bot** | `projects/demand-generator-pro.md` |
| **Note** | Do **not** copy this app into `project-command` — link only. Two local folders = same code; pick one to edit. |

---

### 4. DunningGuard

| Field | Value |
|-------|-------|
| **Name** | DunningGuard |
| **Path** | `C:\Projects\DunningGuard` |
| **Stack** | Next 16, Supabase, Stripe Billing + Connect, Resend, Tailwind, Vercel |
| **Purpose** | Micro-SaaS — recover failed Stripe subscription payments via dunning emails |
| **Maturity** | Mature micro-SaaS shape |
| **Priority** | **P1** — shippable SaaS |
| **Bot strategy** | God Bot + Security Worker for webhooks/RLS; Deploy Worker for Vercel |
| **God Bot** | `projects/dunningguard.md` |

---

### 5. Kepi Travel

| Field | Value |
|-------|-------|
| **Name** | Kepi Travel |
| **Path** | `C:\Projects\Kepi Travel\kepi-travel-reborn` |
| **Alt paths** | `kepi-travel`, `kepi-travel-rebuilt` — **[ASSUMPTION] reborn = most active** |
| **Stack** | Next, MapTiler/MapLibre, Clerk, Upstash Redis, Stripe, Capacitor, Anthropic, Inngest, Sentry |
| **Purpose** | Travel assistant — trips, maps, ops, mobile-capable |
| **Maturity** | Active, large test surface |
| **Priority** | **P1** |
| **Bot strategy** | God Bot + Fix Worker; **build before push** (see kepi-travel AGENTS rules in sibling folder) |
| **God Bot** | `projects/kepi-travel.md` |

---

### 6. Kepi Search

| Field | Value |
|-------|-------|
| **Name** | Kepi Search |
| **Path** | `C:\Projects\Kepi Search\kepi-search` |
| **Stack** | Next, MapLibre, MapTiler, Terra Draw, Turf, OSRM/OpenRouteService |
| **Purpose** | Personal hotel map explorer — draw area, search hotels in European/APAC cities |
| **Maturity** | Active personal tool |
| **Priority** | **P2** |
| **Bot strategy** | God Bot + Feature Worker; city seeds in `scripts/generate-city-seeds.mjs` |
| **God Bot** | `projects/kepi-search.md` |

---

### 7. All In One Edgar

| Field | Value |
|-------|-------|
| **Name** | Edgar (All In One Edgar) |
| **Path** | `C:\Projects\All In One Edgar` |
| **Stack** | .NET (AllInOneEdgar.sln), Docker, NAS (Ugreen), Microsoft Entra auth, office agents |
| **Purpose** | Sign-in web app + PC agents for remote access / office ops; NAS Docker deploy |
| **Maturity** | Active infra product |
| **Priority** | **P2** |
| **Bot strategy** | God Bot + Deploy Worker; start with `START-HERE-EDGAR.md` |
| **God Bot** | `projects/all-in-one-edgar.md` |

---

### 8. Home Compass

| Field | Value |
|-------|-------|
| **Name** | Home Compass (household-compass) |
| **Path** | `C:\Projects\household-compass` |
| **Stack** | Next 15, Supabase, Tailwind 4 |
| **Purpose** | Household continuity — emergency info, vault, money, family map |
| **Maturity** | Active prototype+ (v0.4.0) |
| **Priority** | **P2** |
| **Bot strategy** | God Bot + Feature Worker; mobile/emergency flows matter |
| **God Bot** | `projects/home-compass.md` |

---

### 9. Language Translator

| Field | Value |
|-------|-------|
| **Name** | language-translator |
| **Path** | `C:\Projects\language app` |
| **Stack** | Vite, React 18, PWA (workbox) |
| **Purpose** | Speech + translation PWA (MyMemory/Lingva APIs, local cache) |
| **Maturity** | Prototype / personal utility |
| **Priority** | **P3** |
| **Bot strategy** | God Bot + Fix Worker only — keep simple |
| **God Bot** | `projects/language-translator.md` |

---

### 10. Story Pals

| Field | Value |
|-------|-------|
| **Name** | story_pals |
| **Path** | `C:\Projects\Story Pals` |
| **Stack** | Flutter |
| **Purpose** | **[ASSUMPTION]** Early Flutter app — story/social for kids? (default template README only) |
| **Maturity** | Prototype scaffold |
| **Priority** | **P3** |
| **Bot strategy** | God Bot when Jeff activates; clarify product goal first |
| **God Bot** | `projects/story-pals.md` |

---

### 11. Contractor Takeoff Staging

| Field | Value |
|-------|-------|
| **Name** | contractor-takeoff-staging |
| **Path** | `C:\Projects\contractor-takeoff-staging` |
| **Stack** | Next 15 bare scaffold |
| **Purpose** | Staging/spike shell — not main Takeoff Pro codebase |
| **Maturity** | Empty-ish staging |
| **Priority** | **P3** |
| **Bot strategy** | Usually skip — use Takeoff Pro God Bot unless Jeff says staging task |
| **God Bot** | `projects/contractor-takeoff-staging.md` |

---

## Suggested weekly focus (caveman)

1. **P0:** My Bankruptcy + Takeoff Pro — revenue/legal core
2. **P1:** Demand Generator, DunningGuard, Kepi Travel — ship or stabilize
3. **P2:** Kepi Search, Edgar, Home Compass — when P0/P1 quiet
4. **P3:** Language app, Story Pals, staging — side quests

---

## Index maintenance

When to update:

- New repo under `C:\Projects\`
- Canonical path changes (e.g. Kepi Travel fork picked)
- Deploy URL added
- Duplicate folder resolved

Last scan: **2026-06-14** by Command Center setup.
