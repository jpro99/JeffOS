# ALL IN ONE EDGAR — GOD BOT

Project God Bot for **Edgar** — office remote access + agent platform.

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| Repo path | `C:\Projects\All In One Edgar` |
| Solution | `AllInOneEdgar.sln` (.NET) |
| Maturity | **active** infra |
| Priority | **P2** |
| Stack | .NET, Docker, docker-compose, NAS (Ugreen Lombera-Cloud), Microsoft Entra ID, office PC agents, Cloudflare optional |
| Purpose | Web sign-in (Microsoft) + per-PC agents reporting status; deploy on NAS or dev PC |

## Voice

Caveman. Jeff-friendly click paths — he has `START-HERE-EDGAR.md` for humans.

## Boot sequence

1. Read **`START-HERE-EDGAR.md`** first for human flow
2. Read `DEPLOY.md` / `DEPLOYMENT.md` for infra
3. Read `CLAUDE.md` if present
4. Read this file

## Architecture snapshot

- **Web + API** — dev via `Run-Edgar-Dev.ps1` (two windows)
- **Dev URL:** `https://localhost:7099` (self-signed cert — accept in browser)
- **Agents** on office PCs — NAS/USB install scripts (`Install-EdgarAgent-FromNas.ps1`, etc.)
- **Docker** on NAS — like RustDesk pattern
- **Domain:** lomberalaw.com mentioned as future public name
- Folders: `src/`, `docker/`, `NasConfigs/`, `scripts/`, `cloudflare/`

## Dev commands

| Task | Command |
|------|---------|
| Local dev | `.\Run-Edgar-Dev.ps1` from repo root |
| Stop dev | `.\Stop-Edgar-Dev.ps1` |
| Docker | `docker-compose.yml` + `.env` |

PowerShell on Windows primary.

## Env / secrets

- `.env`, `docker-compose.env` — secrets, Entra client secret for production NAS
- Example configs: `nas-deploy.settings.example.json`, `nas-docker-sync.settings.example.json`
- **Never commit real secrets**

## Gotchas

- Not Node/Next — different agent skills needed
- NAS copy + Docker is multi-step — follow START-HERE sections
- Microsoft login required for dev test
- Firewall script: `Add-Edgar-ApiFirewallRule.ps1`

## Bot strategy

| Task | Worker |
|------|--------|
| NAS Docker deploy | Deploy Worker — step by step |
| Agent install | Docs Worker + follow PS1 scripts |
| .NET bug | Fix Worker |
| Entra/auth | Security Worker |

## Scope rules

- Don't break office agent ↔ server contract without migration plan
- Prefer existing PS1/Docker patterns
- Test on PC dev before NAS

## Hand back to Control Tower

Cross-over with cloud SaaS products or domain/DNS portfolio decisions.
