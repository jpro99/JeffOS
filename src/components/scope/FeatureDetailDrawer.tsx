"use client";

import type { BotDefinition, FeatureStatus, FeatureType, Priority, ProjectFeature } from "@/lib/types";
import { FEATURE_STATUS_COLORS, FEATURE_STATUS_LABELS, STEP_STATUS_COLORS } from "@/lib/orchestration/stats";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface FeatureDetailDrawerProps {
  feature: ProjectFeature;
  bots: BotDefinition[];
  getBot: (id: string) => BotDefinition | undefined;
  onClose: () => void;
  onSave: (f: ProjectFeature) => void;
}

export function FeatureDetailDrawer({ feature, bots, getBot, onClose, onSave }: FeatureDetailDrawerProps) {
  const patch = (partial: Partial<ProjectFeature>) => {
    onSave({ ...feature, ...partial, updatedAt: new Date().toISOString() });
  };

  const advanceStep = (phase: string) => {
    const steps = feature.assignedSteps.map((s) =>
      s.phase === phase ? { ...s, status: "done" as const } : s,
    );
    const allDone = steps.every((s) => s.status === "done" || s.status === "skipped");
    let status: FeatureStatus = feature.status;
    if (phase === "security" && steps.find((s) => s.phase === "security")?.status === "done") {
      patch({ assignedSteps: steps, securityStatus: "ok", status: allDone ? "done" : "testing" });
      return;
    }
    if (phase === "test") status = "testing";
    if (phase === "security") status = "security-review";
    if (allDone) status = "done";
    patch({ assignedSteps: steps, status });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#14161c] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-lg font-medium text-zinc-100">{feature.name}</h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            ✕
          </button>
        </div>

        <div className="space-y-4 p-4">
          <textarea
            value={feature.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-300"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-zinc-600">
              Priority
              <select
                value={feature.priority}
                onChange={(e) => patch({ priority: e.target.value as Priority })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
              >
                {(["P0", "P1", "P2", "P3"] as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-600">
              Type
              <select
                value={feature.type}
                onChange={(e) => patch({ type: e.target.value as FeatureType })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
              >
                <option value="core">Core</option>
                <option value="nice-to-have">Nice-to-have</option>
                <option value="experimental">Experimental</option>
              </select>
            </label>
            <label className="text-xs text-zinc-600 col-span-2">
              Status
              <select
                value={feature.status}
                onChange={(e) => patch({ status: e.target.value as FeatureStatus })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
              >
                {Object.entries(FEATURE_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <p className="text-[10px] uppercase text-zinc-600">Security</p>
            <Badge className="mt-1 capitalize">{feature.securityStatus.replace(/-/g, " ")}</Badge>
          </div>

          {feature.assignedSteps.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-zinc-600">Bot pipeline</p>
              <ul className="mt-2 space-y-2">
                {feature.assignedSteps.map((s) => (
                  <li
                    key={s.phase}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2"
                  >
                    <div>
                      <p className={cn("text-sm capitalize", STEP_STATUS_COLORS[s.status])}>{s.phase}</p>
                      <p className="text-xs text-zinc-600">
                        {getBot(s.botId)?.name ?? s.botType} · {s.modelClass} · {s.interface}
                      </p>
                      <p className="text-[10px] text-zinc-700">{s.summary}</p>
                    </div>
                    {s.status !== "done" && (
                      <button
                        type="button"
                        onClick={() => advanceStep(s.phase)}
                        className="text-xs text-teal-500 hover:text-teal-400"
                      >
                        Mark done
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Badge className={FEATURE_STATUS_COLORS[feature.status]}>
            {FEATURE_STATUS_LABELS[feature.status]}
          </Badge>
        </div>
      </div>
    </div>
  );
}
