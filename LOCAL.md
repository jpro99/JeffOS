# Home PC models (24/7)

**Cursor is in charge.** Small general questions can use Ollama on this Velocity Micro. Code, PRs, demand dollars, and Jeff OS facts stay on paid Cursor. No xAI API key.

Full policy: [docs/CURSOR_IN_CHARGE.md](docs/CURSOR_IN_CHARGE.md)

## Already installed on VM-902385

| Model | Use |
|--------|-----|
| `qwen3.8:27b` | Main local brain (always `--think=false`) |
| `qwen3.5:9b` | Fast rewrites |
| `qwen2.5:14b` | Spare |

```powershell
ollama run qwen3.8:27b --think=false "Rephrase in one short sentence: …"
```

## Away from home

Run `scripts/enable-ollama-tailscale.ps1`, install Tailscale, set `OLLAMA_HOST` to the `100.x` URL. Do not expose port 11434 on the public internet.

## Never use local for

- Demand-letter dollars, exhibits, medical facts
- Anything that goes to a court or adjuster
- Writing the actual code / PR (that is Cursor / Cloud Agents)
