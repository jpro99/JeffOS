"use client";

import { useState } from "react";
import type { ConnectionInventoryItem } from "@/lib/connections/inventory";
import {
  computeApiRunScore,
  scoreColor,
  scoreRingClass,
  type ApiRunScoreResult,
} from "@/lib/connections/api-run-score";
import { suggestIntegrations } from "@/lib/orchestration/integrations";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TryAndRunScorePanel({
  project,
  inventory,
  onNeedScan,
  compact,
}: {
  project: Project;
  inventory?: ConnectionInventoryItem[];
  /** Called when user needs to scan APIs first (Classic scope tab) */
  onNeedScan?: () => void;
  compact?: boolean;
}) {
  const [result, setResult] = useState<ApiRunScoreResult | null>(null);
  const [ran, setRan] = useState(false);

  const run = () => {
    let proj = project;
    const existing = proj.orchestration?.integrationSuggestions ?? [];
    if (existing.length === 0) {
      const suggestions = suggestIntegrations(proj);
      if (suggestions.length > 0 && proj.orchestration) {
        proj = {
          ...proj,
          orchestration: { ...proj.orchestration, integrationSuggestions: suggestions },
        };
        onNeedScan?.();
      }
    }

    const next = computeApiRunScore(proj, inventory);
    setResult(next);
    setRan(true);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.06] to-teal-500/[0.04] p-4",
        compact && "p-3",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/90">
            Ship readiness
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Free check — no API calls, no charges. Reads your scan + connected services.
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">
            ~{result?.baseScore ?? 78}/100 without APIs · {result?.maxWithApis ?? 100}/100 with all APIs
            wired
          </p>
        </div>
        {result && ran && (
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-2 tabular-nums",
              scoreRingClass(result.score),
            )}
          >
            <span className={cn("text-xl font-bold", scoreColor(result.score))}>{result.score}</span>
            <span className="text-[9px] text-zinc-600">/100</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={run}
        className={cn(
          "mt-3 w-full rounded-full bg-violet-500/20 py-3 text-sm font-semibold text-violet-100 ring-1 ring-violet-500/30 hover:bg-violet-500/30",
          compact && "py-2.5",
        )}
      >
        Try and Run It
      </button>

      {result && ran && (
        <div className="mt-3 space-y-2 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-3">
          <p className={cn("text-sm font-medium", scoreColor(result.score))}>{result.headline}</p>
          <p className="text-xs leading-relaxed text-zinc-500">{result.detail}</p>
          {result.lines.length > 0 && (
            <ul className="space-y-1 border-t border-white/[0.06] pt-2">
              {result.lines.map((line) => (
                <li key={line} className="text-[11px] text-zinc-400">
                  {line}
                </li>
              ))}
            </ul>
          )}
          {result.needsScan && (
            <p className="text-xs text-amber-400/90">Tip: Scan for APIs first — then run again.</p>
          )}
        </div>
      )}
    </div>
  );
}
