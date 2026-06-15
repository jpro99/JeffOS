"use client";

import type { Project } from "@/lib/types";
import type { ConnectionInventoryItem } from "@/lib/connections/inventory";
import { CATEGORY_LABELS, inventorySummary } from "@/lib/connections/inventory";
import { markIntegrationConnected, suggestIntegrations } from "@/lib/orchestration/integrations";
import { TryAndRunScorePanel } from "@/components/connections/TryAndRunScorePanel";
import { useMissionControl } from "@/lib/store/context";
import { cn } from "@/lib/utils";
import Link from "next/link";

const statusStyles = {
  connected: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  "needs-setup": "border-amber-500/25 bg-amber-500/10 text-amber-200",
  "not-connected": "border-zinc-500/20 bg-zinc-500/5 text-zinc-500",
};

export function EasyConnectionsInventory({
  project,
  inventory,
}: {
  project: Project;
  inventory: ConnectionInventoryItem[];
}) {
  const { updateProject } = useMissionControl();
  const markConnection = (
    item: ConnectionInventoryItem,
    status: "connected" | "needs-setup" | "not-connected",
  ) => {
    let next = { ...project };

    if (item.connectionId && next.connections) {
      next = {
        ...next,
        connections: next.connections.map((c) =>
          c.id === item.connectionId ? { ...c, setupStatus: status } : c,
        ),
      };
    } else if (next.connections) {
      const kind = item.kind as (typeof next.connections)[0]["kind"];
      const exists = next.connections.find((c) => c.kind === kind);
      if (exists) {
        next = {
          ...next,
          connections: next.connections.map((c) =>
            c.kind === kind ? { ...c, setupStatus: status } : c,
          ),
        };
      }
    }

    if (item.integrationId && next.orchestration) {
      next = {
        ...next,
        orchestration: {
          ...next.orchestration,
          integrationSuggestions: markIntegrationConnected(
            next.orchestration.integrationSuggestions,
            item.integrationId,
            status,
          ),
        },
      };
    }

    updateProject(next);
  };

  const markAllProdConnected = () => {
    let next = { ...project };
    const kinds = inventory
      .filter((i) => i.verifyMethod === "code-wired" || i.verifyMethod === "vercel-cloud")
      .map((i) => i.kind);

    if (next.connections) {
      next = {
        ...next,
        connections: next.connections.map((c) =>
          kinds.includes(c.kind) ? { ...c, setupStatus: "connected" as const } : c,
        ),
      };
    }
    if (next.orchestration) {
      let suggestions = next.orchestration.integrationSuggestions;
      for (const item of inventory) {
        if (item.integrationId && kinds.includes(item.kind)) {
          suggestions = markIntegrationConnected(suggestions, item.integrationId, "connected");
        }
      }
      next = {
        ...next,
        orchestration: { ...next.orchestration, integrationSuggestions: suggestions },
      };
    }
    updateProject(next);
  };

  const summary = inventorySummary(inventory);

  const grouped = inventory.reduce<Record<string, ConnectionInventoryItem[]>>((acc, item) => {
    const key = item.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const VERIFY_LABELS: Record<string, string> = {
    manual: "You confirmed",
    "local-env": "Local .env keys",
    "code-wired": "In package.json",
    "vercel-cloud": "Vercel / cloud keys",
    "catalog-only": "Catalog only",
  };

  return (
    <div className="space-y-4">
      <TryAndRunScorePanel
        project={project}
        inventory={inventory}
        onNeedScan={() => {
          const suggestions = suggestIntegrations(project);
          if (suggestions.length > 0 && project.orchestration) {
            updateProject({
              ...project,
              orchestration: {
                ...project.orchestration,
                integrationSuggestions: suggestions,
              },
            });
          }
        }}
      />

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-zinc-500">
        <strong className="text-zinc-400">Can it truly see setup?</strong> Free scan checks: local{" "}
        <code className="text-zinc-600">.env</code> keys,{" "}
        <code className="text-zinc-600">package.json</code> deps, Vercel link. It does{" "}
        <strong className="text-zinc-400">not</strong> call Duffel/MapTiler APIs (that costs money).
        Keys only on Vercel cloud → shows &quot;wired in code&quot; when deps found.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Everything connected
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Rescan after changing .env — or confirm prod setup below
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
            {summary.connected} connected
          </span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-400">
            {summary.needsSetup} needs setup
          </span>
          <span className="rounded-full bg-zinc-500/10 px-2 py-0.5 text-zinc-500">
            {summary.notConnected} not connected
          </span>
        </div>
      </div>

      {inventory.some((i) => i.verifyMethod === "code-wired" || i.verifyMethod === "vercel-cloud") && (
        <button
          type="button"
          onClick={markAllProdConnected}
          className="rounded-full bg-teal-500/15 px-4 py-2 text-xs font-medium text-teal-200 ring-1 ring-teal-500/25"
        >
          Confirm all prod services connected (Vercel) — then Rescan snapshot
        </button>
      )}

      {inventory.length === 0 ? (
        <p className="text-sm text-zinc-600">No services cataloged — run project scan on disk.</p>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <p className="mb-2 text-[10px] uppercase text-zinc-600">
              {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category}
            </p>
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id + item.kind}
                  className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{item.name}</p>
                        <p className="text-[11px] text-zinc-500">{item.detail}</p>
                        <p className="mt-1 text-[10px] text-zinc-600">{item.statusLabel}</p>
                        <p className="text-[10px] text-violet-700/80">
                          Detected via: {VERIFY_LABELS[item.verifyMethod] ?? item.verifyMethod}
                        </p>
                        {item.envKeys.length > 0 && (
                          <p className="mt-1 font-mono text-[10px] text-teal-800">
                            Keys: {item.envKeys.slice(0, 3).join(", ")}
                            {item.envKeys.length > 3 ? "…" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] capitalize ring-1",
                        statusStyles[item.status],
                      )}
                    >
                      {item.status.replace(/-/g, " ")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.dashboardUrl && (
                      <a
                        href={item.dashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-zinc-400 hover:text-teal-400"
                      >
                        Open dashboard
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => markConnection(item, "connected")}
                      className="rounded-full border border-emerald-500/20 px-3 py-1 text-[10px] text-emerald-600 hover:bg-emerald-500/10"
                    >
                      Mark connected
                    </button>
                    <button
                      type="button"
                      onClick={() => markConnection(item, "needs-setup")}
                      className="text-[10px] text-zinc-600 hover:text-amber-500"
                    >
                      Needs setup
                    </button>
                    <button
                      type="button"
                      onClick={() => markConnection(item, "not-connected")}
                      className="text-[10px] text-zinc-700 hover:text-zinc-500"
                    >
                      Not connected
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <p className="text-[10px] text-zinc-600">
        Live API ping (test Duffel key works) = future optional feature, not free at scale. For now:
        local keys + code deps + your confirm.
        {" "}
        <Link href={`/projects/${project.id}?tab=connections`} className="text-teal-600 hover:underline">
          Classic → Connections
        </Link>
      </p>
    </div>
  );
}
