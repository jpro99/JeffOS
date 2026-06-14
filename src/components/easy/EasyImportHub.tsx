"use client";

import { useState } from "react";
import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { DEFAULT_PROJECTS_ROOT } from "@/lib/discovery/catalog";
import { onImportSuccess } from "@/lib/mission/guided-journey";
import { cn } from "@/lib/utils";

export function EasyImportHub({ compact = false }: { compact?: boolean }) {
  const { state, syncProjectsFromDisk, updateSettings } = useMissionControl();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rootsText, setRootsText] = useState(state.settings.projectsRoots.join("\n"));

  const runImport = async () => {
    setScanning(true);
    setMessage(null);
    const roots = rootsText
      .split(/\n+/)
      .map((r) => r.trim())
      .filter(Boolean);
    if (roots.length > 0) {
      updateSettings({ projectsRoots: roots });
    }
    const result = await syncProjectsFromDisk();
    setMessage(result.ok ? `✓ ${result.message}` : result.message);
    if (result.ok) updateSettings(onImportSuccess(state.settings));
    setScanning(false);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void runImport()}
        disabled={scanning}
        className="rounded-full bg-white/[0.08] px-5 py-2.5 text-sm font-medium text-zinc-200 ring-1 ring-white/10 hover:bg-white/[0.12] disabled:opacity-50"
      >
        {scanning ? "Scanning…" : "Import projects from disk"}
      </button>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-6 shadow-xl shadow-black/20">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-500/90">
          Import your work
        </p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-50">Bring your projects in</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Point Jeff OS at your projects folder — it finds repos and loads them. No manual setup per app.
        </p>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase text-zinc-600">Folders to scan (one per line)</span>
        <textarea
          value={rootsText}
          onChange={(e) => setRootsText(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300"
          placeholder={DEFAULT_PROJECTS_ROOT}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void runImport()}
          disabled={scanning}
          className={cn(
            "rounded-full px-6 py-3 text-sm font-semibold transition",
            scanning
              ? "bg-teal-500/30 text-teal-200"
              : "bg-teal-500 text-black hover:bg-teal-400",
          )}
        >
          {scanning ? "Scanning disk…" : "Import projects"}
        </button>
        <span className="text-xs text-zinc-600">{state.projects.length} projects loaded</span>
      </div>

      {message && (
        <p className={cn("text-sm", message.startsWith("✓") ? "text-emerald-400" : "text-rose-400")}>
          {message}
        </p>
      )}

      <p className="text-[10px] text-zinc-600">
        Matches known apps (Kepi, Demand Gen, etc.) plus unknown folders if enabled in{" "}
        <Link href="/easy/settings" className="text-teal-600 hover:underline">
          Settings
        </Link>
        .
      </p>
    </section>
  );
}
