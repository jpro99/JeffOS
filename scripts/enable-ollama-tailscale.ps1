# Bind Ollama on all interfaces so Tailscale can reach the 24/7 home bot.
# Does not open the public internet. Install Tailscale after this and share the 100.x URL with Cursor.

$ErrorActionPreference = "Stop"
Write-Host "Setting OLLAMA_HOST=0.0.0.0 so Tailscale peers can reach port 11434..."
setx OLLAMA_HOST "0.0.0.0" | Out-Null
$env:OLLAMA_HOST = "0.0.0.0"

Write-Host "Restart Ollama from the system tray (Quit, then open Ollama again)."
Write-Host ""
Write-Host "Then:"
Write-Host "  1. Install Tailscale on this PC: https://tailscale.com/download/windows"
Write-Host "  2. Sign in with the same account on your phone"
Write-Host "  3. Run:  ollama list"
Write-Host "  4. In Tailscale, copy this PC's 100.x address"
Write-Host "  5. In Cursor Settings, set env OLLAMA_HOST=http://100.x.x.x:11434"
Write-Host ""
Write-Host "Do not port-forward 11434 on your router. Tailscale only."
