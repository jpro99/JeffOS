"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { Card, CardTitle } from "@/components/ui/Card";
import { CONNECTION_ICONS } from "@/lib/connections/catalog";
import { costAlertClasses, getCostAlertLevel, sumProjectCost } from "@/lib/connections/helpers";
import { EasyCostBreakdown } from "@/components/easy/EasyCostBreakdown";
import { cn } from "@/lib/utils";

export function ProjectConnectionsPanel({ project }: { project: Project }) {
  const { state, updateProject, addActivity } = useMissionControl();
  const [folderMsg, setFolderMsg] = useState<string | null>(null);
  const connections = project.connections ?? [];
  const github = connections.find((c) => c.kind === "github") ?? (project.github ? { url: project.github } : null);

  const monthly = sumProjectCost(project);
  const threshold = state.settings.monthlyCostThresholdUsd;
  const warnPct = state.settings.costWarningPercent;
  const alert = getCostAlertLevel(monthly, threshold, warnPct);

  const openFolder = async () => {
    if (!project.path) {
      setFolderMsg("No local path on file");
      return;
    }
    setFolderMsg(null);
    try {
      const res = await fetch("/api/projects/open-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: project.path }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; message?: string };
      if (data.ok) {
        addActivity(`Opened folder: ${project.name}`, "project", project.id);
        setFolderMsg("Opened in Explorer");
      } else {
        setFolderMsg(data.error ?? "Failed");
      }
    } catch {
      setFolderMsg("Run npm run dev locally to open folders");
    }
  };

  const openUrl = (url: string, label: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    addActivity(`Opened ${label}`, "project", project.id);
  };

  const updateConnectionCost = (connId: string, amount: number) => {
    if (!project.connections) return;
    const next = project.connections.map((c) =>
      c.id === connId ? { ...c, estimatedMonthlyUsd: amount, billingSource: "manual" as const } : c,
    );
    const lines = next.filter((c) => c.estimatedMonthlyUsd > 0).map((c) => ({
      connectionId: c.id,
      label: c.name,
      amountUsd: c.estimatedMonthlyUsd,
    }));
    const estimatedMonthlyUsd = next.reduce((s, c) => s + c.estimatedMonthlyUsd, 0);
    updateProject({
      ...project,
      connections: next,
      costProfile: { estimatedMonthlyUsd, lines, lastUpdated: new Date().toISOString() },
    });
  };

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>Connections</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">GitHub, deploy, APIs — one tap to the right dashboard.</p>
        </div>
        <div className="max-w-sm shrink-0">
          <EasyCostBreakdown project={project} compact defaultOpen={false} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {project.path && (
          <button
            type="button"
            onClick={openFolder}
            className="rounded-full bg-teal-500/15 px-4 py-2 text-sm font-medium text-teal-200 ring-1 ring-teal-500/25"
          >
            📁 Open project folder
          </button>
        )}
        {github?.url && (
          <button
            type="button"
            onClick={() => openUrl(github.url, "GitHub")}
            className="rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-zinc-200 hover:bg-white/[0.07]"
          >
            ⎇ GitHub
          </button>
        )}
        {project.path && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(project.path!);
              setFolderMsg("Path copied");
            }}
            className="rounded-full border border-white/[0.08] px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300"
          >
            Copy path
          </button>
        )}
      </div>

      {folderMsg && <p className="text-xs text-teal-600">{folderMsg}</p>}

      {project.path && (
        <p className="truncate font-mono text-[11px] text-zinc-600">{project.path}</p>
      )}

      {connections.length === 0 ? (
        <p className="text-sm text-zinc-600">No connections cataloged yet.</p>
      ) : (
        <ul className="space-y-2">
          {connections.map((conn) => (
            <li
              key={conn.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              <span className="text-lg">{CONNECTION_ICONS[conn.kind] ?? "◇"}</span>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => openUrl(conn.dashboardUrl ?? conn.url, conn.name)}
                  className="text-left text-sm font-medium text-zinc-200 hover:text-teal-400"
                >
                  {conn.name}
                </button>
                {conn.description && (
                  <p className="text-[11px] text-zinc-600">{conn.description}</p>
                )}
              </div>
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                <span>$</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={conn.estimatedMonthlyUsd}
                  onChange={(e) => updateConnectionCost(conn.id, Number(e.target.value) || 0)}
                  className="w-14 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-right text-zinc-300"
                />
                <span>/mo</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {alert !== "ok" && (
        <p className={cn("rounded-xl px-3 py-2 text-sm", alert === "danger" ? "bg-rose-500/10 text-rose-300" : "bg-amber-500/10 text-amber-300")}>
          {alert === "danger"
            ? `Over $${threshold}/mo threshold — review API usage.`
            : `Approaching $${threshold}/mo limit (${warnPct}% warning).`}
        </p>
      )}

      <p className="text-[10px] text-zinc-600">
        Costs are estimates — edit per service. Live billing API sync coming later.
      </p>
    </Card>
  );
}
