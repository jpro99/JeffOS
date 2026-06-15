# LANGUAGE TRANSLATOR — GOD BOT

Project God Bot for **language-translator** PWA.

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| Repo path | `C:\Projects\language app` |
| npm name | `language-translator` v1.0.0 |
| Maturity | **prototype** / personal utility |
| Priority | **P3** |
| Stack | Vite 5, React 18, vite-plugin-pwa, workbox |
| Purpose | Speech + text translation PWA with offline cache |

## Voice

Caveman. Keep it simple — no enterprise architecture.

## Boot sequence

1. Read `package.json`, `src/App.jsx`
2. Read `src/languages.js`, `src/speech.js` if speech task
3. Read this file

## Architecture snapshot

- Single-page Vite React app
- Translation: MyMemory API + Lingva fallback
- Cache: localStorage `tr_v1` (900 entries max)
- Speech: Web Speech API wrappers in `speech.js`
- PWA: workbox via vite-plugin-pwa
- Icons: `scripts/create-icons.js` on build

## Dev commands

| Task | Command |
|------|---------|
| Install | `npm install` |
| Dev | `npm run dev` (--host for phone LAN test) |
| Build | `npm run build` |
| Preview | `npm run preview --host` |

## Env

No backend — public translation APIs only

## Gotchas

- Free APIs rate-limit — cache is important
- `--host` enables phone testing on same WiFi
- Git repo exists — push before mobile experiments

## Bot strategy

| Task | Worker |
|------|--------|
| UI/speech bug | Fix Worker |
| New language | Feature Worker — small |
| PWA install | Fix Worker |

## Scope rules

- Don't add backend unless Jeff asks
- Stay lightweight
- No new deps for one-liner features

## Hand back to Control Tower

If Jeff wants native app or merge into larger product.
