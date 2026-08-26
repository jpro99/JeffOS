# Cursor in charge — every project

Cursor decides: home Ollama for small general questions, paid Cursor when that is not good enough. This is one User Rule in Cursor, not a new app and not an xAI key.

## What Cursor can do today

| Where you are | Can Cursor see the home bot? |
|---------------|------------------------------|
| Cursor **Desktop** on the Velocity Micro (`VM-902385`) | Yes — `http://127.0.0.1:11434` |
| Cursor on a phone / hotel / Cloud Agent | Only after Tailscale (or similar) on the 24/7 PC |
| This Cloud Agent **right now** | No — it cannot see your `C:\` Ollama |

Cursor does not have a built-in “try Ollama then upgrade” switch. The **User Rule** below makes every Cursor chat follow that policy. Cloud Agents on this account have open egress, so once the home box has a Tailscale URL they can call it.

## One-time: paste this in Cursor (all projects)

Cursor → **Settings → Rules → User Rules** (applies to Demand Generator, Travel, Jeff OS, everything):

```
You are Cursor. You decide local vs paid for every project.

Code / PR / implement / demand dollars / exhibits / medical / GIS: stay paid Cursor. Never use the home model for those.

General / short / rephrase: try home Ollama first.
- If OLLAMA_HOST is set, use it.
- Else if C:\Projects exists, use http://127.0.0.1:11434
- Else skip local (Cloud Agent / phone without Tailscale). Do not call Linux localhost.

POST {host}/api/chat  think=false  model qwen3.8:27b (fallback qwen3.5:9b).

Keep the local answer only if it is short and does not call Jeff OS fictional, dump Thinking…, or invent a god-like "God Bot". Otherwise answer as paid Cursor. Say which lane you used. No xAI API key.
```

## Away from the desk (phone / Cloud Agent)

The 24/7 PC must stay on. Ollama is already installed. Expose it on **Tailscale only** — not the public internet.

On the Velocity Micro (PowerShell as Administrator):

```powershell
cd "C:\Projects\Project Command\jeff-mission-control"
powershell -ExecutionPolicy Bypass -File .\scripts\enable-ollama-tailscale.ps1
```

Then install https://tailscale.com/download on that PC and on your phone, same account. The script prints the URL to put in Cursor as `OLLAMA_HOST` (or a Cloud Agent secret) — like `http://100.x.x.x:11434`.

## Do not type

- `XAI_API_KEY` in Project Command
- Gemini keys for this router
- Ollama on Vercel pointing at `localhost`

Paid brain = Cursor. Home brain = Ollama on `VM-902385`.
