"use client";

import { useState } from "react";
import { useMissionControl } from "@/lib/store/context";
import { RelativeTime } from "@/components/ui/RelativeTime";

export function ProjectDiscoveryPanel({ compact }: { compact?: boolean }) {
  const { state, syncProjectsFromDisk, updateSettings } = useMissionControl();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runScan = async () => {
    setScanning(true);
    setMessage(null);
    const result = await syncProjectsFromDisk();
    setMessage(result.message);
    setScanning(false);
  };

  const s = state.settings;
  const missing = state.projects.filter((p) => p.path && p.pathExists === false);

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runScan}
          disabled={scanning}
          className="rounded-full bg-teal-500/15 px-4 py-2 text-sm text-teal-200 ring-1 ring-teal-500/25 disabled:opacity-50"
        >
          {scanning ? "Scanning…" : "Scan C:\\Projects"}
        </button>
        {message && <span className="text-xs text-zinc-500">{message}</span>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-100">Project discovery</p>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Scans <code className="text-teal-700">C:\Projects</code> and{" "}
            <code className="text-teal-700">C:\vercel generator</code>. Matches Jeff OS catalog — Bankruptcy,
            Takeoff, DunningGuard, Kepi Travel, Edgar, and more.
          </p>
        </div>
        <button
          type="button"
          onClick={runScan}
          disabled={scanning}
          className="rounded-full bg-teal-500/15 px-5 py-2.5 text-sm font-medium text-teal-200 ring-1 ring-teal-500/25 disabled:opacity-50"
        >
          {scanning ? "Scanning disk…" : "Scan now"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-600">
        <span>{state.projects.length} projects in Jeff OS</span>
        {s.lastDiscoveryAt && (
          <span>
            Last scan <RelativeTime iso={s.lastDiscoveryAt} />
          </span>
        )}
        {missing.length > 0 && (
          <span className="text-amber-500/80">{missing.length} path(s) not found on disk</span>
        )}
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3">
        <span className="text-sm text-zinc-300">Auto-scan on app load</span>
        <button
          type="button"
          role="switch"
          aria-checked={s.autoDiscoverProjects}
          onClick={() => updateSettings({ autoDiscoverProjects: !s.autoDiscoverProjects })}
          className={`relative h-6 w-11 rounded-full transition ${s.autoDiscoverProjects ? "bg-teal-500/40" : "bg-zinc-700"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${s.autoDiscoverProjects ? "left-5" : "left-0.5"}`}
          />
        </button>
      </label>

      {message && (
        <p className={`mt-3 text-sm ${message.includes("failed") ? "text-rose-400" : "text-teal-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
