"use client";

import Link from "next/link";
import { summarizePortfolio } from "@/lib/mission/portfolio-pulse";
import { useMissionControl } from "@/lib/store/context";
import { cn } from "@/lib/utils";

export function EasyPortfolioPulse() {
  const { state } = useMissionControl();
  const pulse = summarizePortfolio(state);

  return (
    <section
      id="portfolio-pulse"
      className="space-y-4 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-5 shadow-lg shadow-black/20"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-500/90">
          Portfolio pulse — all projects
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Track everything. Pick one → Builder Hub → bots build in one day.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Projects", value: pulse.total, tone: "text-zinc-200" },
          { label: "Verified", value: pulse.verified, tone: "text-emerald-300" },
          { label: "Need verify", value: pulse.needsVerify, tone: "text-amber-200" },
          { label: "Has backlog", value: pulse.gapProjects, tone: "text-violet-200" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2 text-center"
          >
            <p className={cn("text-xl font-bold", s.tone)}>{s.value}</p>
            <p className="text-[10px] text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {pulse.rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/easy/projects/${row.id}`}
              className="flex items-start justify-between gap-2 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 transition hover:border-teal-500/25 hover:bg-teal-500/5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-200">{row.name}</p>
                <p className="truncate text-[11px] text-zinc-600">{row.nextTitle}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-medium ring-1",
                    row.verified
                      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25"
                      : row.buildPassed
                        ? "bg-teal-500/10 text-teal-300 ring-teal-500/25"
                        : "bg-zinc-500/10 text-zinc-500 ring-white/10",
                  )}
                >
                  {row.verified ? "Ship ready" : row.buildPassed ? "Built" : "Verify?"}
                </span>
                {row.gapSignal > 0 && (
                  <span className="text-[9px] text-amber-400/90">~{row.gapSignal} items</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/easy#builder-hub"
          className="rounded-full bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-200 ring-1 ring-violet-500/30 hover:bg-violet-500/30"
        >
          One-day sprint → Builder
        </Link>
        <Link href="/easy/projects" className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400">
          All projects
        </Link>
      </div>
    </section>
  );
}
