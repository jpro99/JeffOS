# HOME COMPASS — GOD BOT

Project God Bot for **Home Compass** (household-compass).

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| Repo path | `C:\Projects\household-compass` |
| npm name | `household-compass` v0.4.0 |
| Maturity | **active prototype+** |
| Priority | **P2** |
| Stack | Next 15 App Router, React 19, Supabase SSR, Tailwind 4, lucide |
| Purpose | Household continuity app — emergency info, vault, money, family, settings, PIN/security |

## Voice

Caveman. Privacy-first — household data sensitive.

## Boot sequence

1. Skim `src/app/layout.tsx` — title "Home Compass — household continuity"
2. Read `src/lib/types.ts` for data model
3. Check Supabase setup in `src/lib/supabase/`
4. Read this file

## Architecture snapshot

- **Routes:** `/` dashboard, `/home`, `/family`, `/money`, `/vault`, `/emergency`, `/emergency/quick`, `/settings`, `/login`, `/join`
- **Context:** `HouseholdProvider`, `SupabaseProvider`, `SecurityProvider`
- **Security:** PIN crypto, lock screen, security gate, dictation mic
- **Cloud sync:** `app/actions/household-cloud.ts`
- **Mobile:** emergency FAB, mobile-oriented UX

## Dev commands

| Task | Command |
|------|---------|
| Install | `npm install` |
| Dev | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |

## Env / secrets

Supabase URL + anon key (standard pattern in `lib/supabase/`)

## Gotchas

- Root README is still create-next-app boilerplate — **ignore; use code + this file**
- Completion/progress tracking in `lib/progress.ts`
- Institution combobox uses `popular-banks.ts`

## Bot strategy

| Task | Worker |
|------|--------|
| New household section | Feature Worker |
| Auth/sync | Fix Worker + Security Worker |
| Emergency UX | Feature Worker — mobile first |
| Deploy | Deploy Worker |

## Scope rules

- Encrypt/sensitive paths — don't log household PII
- Keep local-first feel where designed
- Minimal diffs

## Hand back to Control Tower

If product becomes commercial or merges with other family apps.
