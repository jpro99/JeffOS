"use client";

import { useCallback, useState } from "react";
import { useMissionControl } from "@/lib/store/context";
import { cn } from "@/lib/utils";

export function EasyPcBridgePanel() {
  const { state, updateSettings } = useMissionControl();
  const [urlDraft, setUrlDraft] = useState(state.settings.bridgeUrl ?? "");
  const [tokenDraft, setTokenDraft] = useState(state.settings.bridgeToken ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const save = useCallback(() => {
    const bridgeUrl = urlDraft.trim().replace(/\/+$/, "") || null;
    const bridgeToken = tokenDraft.trim() || null;
    updateSettings({ bridgeUrl, bridgeToken });
    setMsg(
      bridgeToken
        ? bridgeUrl
          ? "Saved — Lemon will try direct bridge, then cloud queue"
          : "Token saved — Lemon queues jobs; keep npm run bridge on your PC"
        : "Cleared PC bridge",
    );
  }, [urlDraft, tokenDraft, updateSettings]);

  const testBridge = async () => {
    setTesting(true);
    setMsg(null);
    const url = (urlDraft.trim() || state.settings.bridgeUrl || "").replace(/\/+$/, "");
    const token = tokenDraft.trim() || state.settings.bridgeToken || "";
    if (!url) {
      setMsg("Enter Bridge URL first (from your PC LAN/Tailscale IP)");
      setTesting(false);
      return;
    }
    try {
      const res = await fetch(`${url}/health`, { mode: "cors" });
      const data = (await res.json()) as { ok?: boolean };
      if (data.ok) {
        setMsg("Bridge reachable ✓ — save token if you haven’t, then Go on Add to project");
      } else {
        setMsg("Bridge responded but not healthy");
      }
    } catch {
      setMsg(
        "Can’t reach bridge from this browser. Same Wi‑Fi? Or use Tailscale. Token-only queue still works if PC is polling Lemon.",
      );
    } finally {
      setTesting(false);
    }
  };

  const configured = Boolean(state.settings.bridgeToken);

  return (
    <section
      id="pc-bridge"
      className={cn(
        "rounded-2xl border p-5",
        configured
          ? "border-violet-500/30 bg-violet-500/[0.06]"
          : "border-white/[0.08] bg-white/[0.02]",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/90">
        Lemon → your PC
      </p>
      <h2 className="mt-1 text-lg font-semibold text-zinc-50">PC Bridge — open Cursor from Lemon</h2>
      <p className="mt-2 text-sm text-zinc-500">
        Vercel can’t launch Cursor by itself. Run a tiny bridge on your PC; Lemon sends Go → Cursor
        opens with the prompt.
      </p>

      <ol className="mt-4 space-y-2 text-sm text-zinc-400">
        <li>
          <strong className="text-zinc-200">1.</strong> On your PC (Jeff OS folder):{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-violet-200">
            npm run bridge
          </code>
        </li>
        <li>
          <strong className="text-zinc-200">2.</strong> Copy the <strong className="text-zinc-300">Token</strong>{" "}
          printed in that window (and LAN URL if phone is on same Wi‑Fi / Tailscale).
        </li>
        <li>
          <strong className="text-zinc-200">3.</strong> Paste below → Save → use Lemon Add → Go.
        </li>
      </ol>

      <div className="mt-4 space-y-3">
        <label className="block text-[10px] uppercase text-zinc-600">
          Bridge URL (optional if PC polls Lemon)
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="http://192.168.1.20:3927"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300"
          />
        </label>
        <label className="block text-[10px] uppercase text-zinc-600">
          Bridge token (required)
          <input
            value={tokenDraft}
            onChange={(e) => setTokenDraft(e.target.value)}
            placeholder="paste token from npm run bridge"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-400"
          >
            Save bridge
          </button>
          <button
            type="button"
            disabled={testing}
            onClick={() => void testBridge()}
            className="rounded-full border border-white/15 px-4 py-2 text-xs text-zinc-300 hover:bg-white/[0.05] disabled:opacity-40"
          >
            {testing ? "Testing…" : "Test URL"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-zinc-600">
        Token alone is enough: bridge polls Lemon every few seconds. Direct URL is faster when phone
        can reach your PC (home Wi‑Fi or Tailscale).
      </p>
      {msg && <p className="mt-2 text-xs text-teal-400">{msg}</p>}
    </section>
  );
}
