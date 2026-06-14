"use client";

import { useState } from "react";
import type {
  BrainstormCandidate,
  CostPattern,
  FeatureType,
  Priority,
  Project,
  ProjectFeature,
} from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { brainstormFeatures } from "@/lib/orchestration/brainstorm";
import { createFeature } from "@/lib/orchestration/defaults";
import { suggestIntegrations, markIntegrationConnected } from "@/lib/orchestration/integrations";
import {
  approvePlan,
  generateOrchestrationPlan,
  applyPlanToFeatures,
  rerunOrchestration,
} from "@/lib/orchestration/plan";
import {
  FEATURE_STATUS_COLORS,
  FEATURE_STATUS_LABELS,
  STEP_STATUS_COLORS,
  getOrchestrationStats,
} from "@/lib/orchestration/stats";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { FeatureDetailDrawer } from "@/components/scope/FeatureDetailDrawer";

const PLATFORMS = ["web", "mobile", "desktop", "api"];

export function OrchestratorHub({ project }: { project: Project }) {
  const { state, updateProject, getBot, addActivity } = useMissionControl();
  const orch = project.orchestration!;
  const stats = getOrchestrationStats(project);
  const [selectedFeature, setSelectedFeature] = useState<ProjectFeature | null>(null);
  const [costPattern, setCostPattern] = useState<CostPattern>(orch.plan?.costPattern ?? "mixed");
  const [newFeat, setNewFeat] = useState({ name: "", description: "" });

  const save = (next: Project) => {
    updateProject({ ...next, lastUpdated: new Date().toISOString() });
  };

  const patchOrch = (patch: Partial<typeof orch>) => {
    save({ ...project, orchestration: { ...orch, ...patch } });
  };

  const updateScope = (field: string, value: string | string[]) => {
    patchOrch({
      scope: { ...orch.scope, [field]: value, updatedAt: new Date().toISOString() },
    });
  };

  const updateConstraints = (field: "budget" | "timeline" | "complexity", value: string) => {
    patchOrch({
      scope: {
        ...orch.scope,
        constraints: { ...orch.scope.constraints, [field]: value },
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const addFeature = () => {
    if (!newFeat.name.trim()) return;
    const f = createFeature({ name: newFeat.name.trim(), description: newFeat.description.trim() });
    patchOrch({ features: [...orch.features, f] });
    setNewFeat({ name: "", description: "" });
    addActivity(`Added feature: ${f.name}`, "project", project.id);
  };

  const runBrainstorm = () => {
    const candidates = brainstormFeatures(project);
    patchOrch({ brainstormCandidates: candidates });
    addActivity(`Brainstorm: ${candidates.length} candidates`, "project", project.id);
  };

  const addCandidate = (c: BrainstormCandidate) => {
    const f = createFeature({
      name: c.name,
      description: c.description,
      type: c.type,
      priority: c.priority,
      status: "not-built",
    });
    patchOrch({
      features: [...orch.features, f],
      brainstormCandidates: orch.brainstormCandidates.filter((x) => x.id !== c.id),
    });
  };

  const generatePlan = () => {
    const plan = generateOrchestrationPlan(project, state.bots, costPattern);
    const features = applyPlanToFeatures(orch.features, plan, state.bots);
    const integrations =
      orch.integrationSuggestions.length > 0
        ? orch.integrationSuggestions
        : suggestIntegrations(project);
    patchOrch({ plan, features, integrationSuggestions: integrations });
    addActivity("Generated orchestration plan", "routing", project.id);
  };

  const onApprove = () => {
    if (!orch.plan) return;
    save(approvePlan(project, state.bots));
    addActivity("Orchestration plan approved — building", "project", project.id);
  };

  const onRerun = () => {
    save(rerunOrchestration(project, state.bots, costPattern));
    addActivity("Reran orchestration suggestions", "routing", project.id);
  };

  const updateFeature = (f: ProjectFeature) => {
    patchOrch({ features: orch.features.map((x) => (x.id === f.id ? f : x)) });
    setSelectedFeature(f);
  };

  const togglePlatform = (p: string) => {
    const set = new Set(orch.scope.platforms);
    if (set.has(p)) set.delete(p);
    else set.add(p);
    updateScope("platforms", [...set]);
  };

  return (
    <div className="space-y-8">
      {/* Progress strip */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <Stat label="Features" value={`${stats.done}/${stats.total} done`} />
        <Stat label="Building" value={String(stats.building)} warn={stats.building > 0} />
        <Stat label="Blocked" value={String(stats.blocked)} danger={stats.blocked > 0} />
        <Stat label="Security" value={`${stats.securityScore}%`} />
        <Stat
          label="Plan"
          value={stats.planApproved ? "Approved" : "Draft"}
          ok={stats.planApproved}
        />
      </div>

      {/* Scope */}
      <Card className="space-y-4">
        <CardTitle>Project scope</CardTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="One-line pitch">
            <input
              value={orch.scope.pitch}
              onChange={(e) => updateScope("pitch", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-teal-500/30"
              placeholder="What is this in one sentence?"
            />
          </Field>
          <Field label="Target users">
            <input
              value={orch.scope.targetUsers}
              onChange={(e) => updateScope("targetUsers", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-teal-500/30"
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              value={project.description}
              onChange={(e) => save({ ...project, description: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-teal-500/30"
            />
          </Field>
          <Field label="Goals" className="md:col-span-2">
            <textarea
              value={project.goals.join("\n")}
              onChange={(e) =>
                save({ ...project, goals: e.target.value.split("\n").filter(Boolean) })
              }
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-teal-500/30"
              placeholder="One goal per line"
            />
          </Field>
          <Field label="Tech preferences">
            <input
              value={orch.scope.techPreferences}
              onChange={(e) => updateScope("techPreferences", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-teal-500/30"
            />
          </Field>
          <Field label="Platforms">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs capitalize",
                    orch.scope.platforms.includes(p)
                      ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-500/30"
                      : "border border-white/10 text-zinc-500",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Budget constraint">
            <input
              value={orch.scope.constraints.budget}
              onChange={(e) => updateConstraints("budget", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-teal-500/30"
            />
          </Field>
          <Field label="Timeline">
            <input
              value={orch.scope.constraints.timeline}
              onChange={(e) => updateConstraints("timeline", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-teal-500/30"
            />
          </Field>
        </div>
      </Card>

      {/* Features */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Features</CardTitle>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runBrainstorm}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/[0.03]"
            >
              Brainstorm features
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newFeat.name}
            onChange={(e) => setNewFeat({ ...newFeat, name: e.target.value })}
            placeholder="Feature name"
            className="w-full flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-teal-500/30"
          />
          <input
            value={newFeat.description}
            onChange={(e) => setNewFeat({ ...newFeat, description: e.target.value })}
            placeholder="Short description"
            className="w-full flex-[2] rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-teal-500/30"
          />
          <button
            type="button"
            onClick={addFeature}
            className="shrink-0 rounded-full bg-teal-500/15 px-5 py-2 text-sm font-medium text-teal-200 ring-1 ring-teal-500/25"
          >
            Add feature
          </button>
        </div>

        {orch.brainstormCandidates.length > 0 && (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-xs font-medium text-violet-300">Brainstorm candidates — tap Add</p>
            <ul className="mt-3 space-y-2">
              {orch.brainstormCandidates.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-black/20 px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-zinc-200">{c.name}</p>
                    <p className="text-xs text-zinc-500">{c.rationale}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addCandidate(c)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {orch.features.length === 0 ? (
          <p className="text-sm text-zinc-600">No features yet. Add or brainstorm.</p>
        ) : (
          <ul className="space-y-2">
            {orch.features.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setSelectedFeature(f)}
                  className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left hover:border-teal-500/20"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-200">{f.name}</p>
                    <p className="truncate text-xs text-zinc-600">{f.description}</p>
                  </div>
                  <Badge className={FEATURE_STATUS_COLORS[f.status]}>
                    {FEATURE_STATUS_LABELS[f.status]}
                  </Badge>
                  <Badge className="border-white/10 bg-white/5 text-zinc-500">{f.type}</Badge>
                  <span className="text-[10px] text-zinc-600">
                    {f.assignedSteps.filter((s) => s.status === "done").length}/{f.assignedSteps.length} steps
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Orchestration plan */}
      <Card className="space-y-4">
        <CardTitle>Auto-orchestra</CardTitle>
        <p className="text-sm text-zinc-500">
          Who builds what, build order, model choices. Approve before active build.
        </p>

        <div className="flex flex-wrap gap-2">
          {(["cheap", "mixed", "strong"] as CostPattern[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setCostPattern(p)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm capitalize",
                costPattern === p
                  ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-500/30"
                  : "border border-white/10 text-zinc-500",
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={generatePlan}
            disabled={!orch.features.length}
            className="rounded-full bg-teal-500/15 px-5 py-2 text-sm font-medium text-teal-200 ring-1 ring-teal-500/25 disabled:opacity-40"
          >
            Generate plan
          </button>
          <button
            type="button"
            onClick={onRerun}
            disabled={!orch.features.length}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 disabled:opacity-40"
          >
            Rerun suggestions
          </button>
          {orch.plan && !orch.plan.approved && (
            <button type="button" onClick={onApprove} className="rounded-full bg-emerald-500/20 px-5 py-2 text-sm font-medium text-emerald-200 ring-1 ring-emerald-500/30">
              Approve plan
            </button>
          )}
        </div>

        {orch.plan && (
          <div className="space-y-4 rounded-xl bg-black/25 p-4">
            <p className="text-sm text-zinc-300">{orch.plan.summary}</p>
            <p className="text-xs text-zinc-500">{orch.plan.modelNotes}</p>
            {orch.plan.approved && (
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Planning approved</Badge>
            )}

            <div>
              <p className="text-[10px] uppercase text-zinc-600">Build order</p>
              <ol className="mt-2 space-y-1">
                {orch.plan.buildOrder.map((fid, i) => {
                  const f = orch.features.find((x) => x.id === fid);
                  return (
                    <li key={fid} className="text-sm text-zinc-400">
                      {i + 1}. {f?.name ?? fid}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div>
              <p className="text-[10px] uppercase text-zinc-600">Who builds what</p>
              <ul className="mt-2 space-y-2">
                {orch.plan.botAssignments.map((a) => (
                  <li key={a.botId} className="rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                    <span className="text-teal-400">{getBot(a.botId)?.name ?? a.botType}</span>
                    <span className="text-zinc-500"> — {a.role}</span>
                    <p className="mt-1 text-xs text-zinc-600">
                      {a.featureIds
                        .map((id) => orch.features.find((f) => f.id === id)?.name)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {orch.plan.parallelGroups.length > 1 && (
              <div>
                <p className="text-[10px] uppercase text-zinc-600">Parallel work (when safe)</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {orch.plan.parallelGroups.length} groups — multiple features can move at once
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pipeline view for approved plans */}
        {orch.plan?.approved && orch.features.some((f) => f.assignedSteps.length) && (
          <div className="space-y-3">
            <p className="text-[10px] uppercase text-zinc-600">Feature pipelines</p>
            {orch.features.map((f) => (
              <div key={f.id} className="rounded-xl border border-white/[0.05] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">{f.name}</span>
                  <Badge className={FEATURE_STATUS_COLORS[f.status]}>{FEATURE_STATUS_LABELS[f.status]}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.assignedSteps.map((s) => (
                    <span
                      key={s.phase}
                      className={cn("rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px]", STEP_STATUS_COLORS[s.status])}
                      title={s.summary}
                    >
                      {s.phase} · {getBot(s.botId)?.name.split(" ")[0] ?? s.botType}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Integrations */}
      <Card className="space-y-4">
        <CardTitle>Recommended APIs</CardTitle>
        <p className="text-sm text-zinc-500">
          Suggested providers + cost ranges. No auto-signup — you authorize manually.
        </p>
        <button
          type="button"
          onClick={() => patchOrch({ integrationSuggestions: suggestIntegrations(project) })}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400"
        >
          Scan for APIs
        </button>
        {orch.integrationSuggestions.length === 0 ? (
          <p className="text-sm text-zinc-600">Run scan after scope is filled in.</p>
        ) : (
          <ul className="space-y-3">
            {orch.integrationSuggestions.map((int) => (
              <li key={int.id} className="rounded-xl border border-white/[0.06] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-200">{int.name}</p>
                    <p className="text-xs text-zinc-500">{int.purpose}</p>
                    {int.enables && <p className="mt-1 text-xs text-teal-700">Enables: {int.enables}</p>}
                  </div>
                  <Badge
                    className={
                      int.connectionStatus === "connected"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : int.connectionStatus === "needs-setup"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
                    }
                  >
                    {int.connectionStatus.replace(/-/g, " ")}
                  </Badge>
                </div>
                <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                  {int.providers.map((p) => (
                    <li key={p.name}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">
                        {p.name}
                      </a>
                      {" · "}
                      {p.costRange} · {p.complexity} complexity
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-zinc-600">{int.notes}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {int.authorizeUrl && (
                    <a
                      href={int.authorizeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300"
                    >
                      Connect {int.recommendedProvider}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      patchOrch({
                        integrationSuggestions: markIntegrationConnected(
                          orch.integrationSuggestions,
                          int.id,
                          "needs-setup",
                        ),
                      })
                    }
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Mark needs setup
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      patchOrch({
                        integrationSuggestions: markIntegrationConnected(
                          orch.integrationSuggestions,
                          int.id,
                          "connected",
                        ),
                      })
                    }
                    className="text-xs text-emerald-600 hover:text-emerald-400"
                  >
                    Mark connected
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* God mode scope view */}
      <Card className="space-y-3">
        <CardTitle>Ultimate scope view</CardTitle>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li>
            <span className="text-zinc-600">Vision:</span> {orch.scope.pitch || project.description}
          </li>
          <li>
            <span className="text-zinc-600">Building now:</span>{" "}
            {orch.features.filter((f) => f.status === "building").map((f) => f.name).join(", ") || "Nothing yet — approve plan"}
          </li>
          <li>
            <span className="text-zinc-600">Left:</span>{" "}
            {orch.features.filter((f) => f.status !== "done").map((f) => f.name).join(", ") || "Define features"}
          </li>
          <li>
            <span className="text-zinc-600">Blocked:</span>{" "}
            {orch.features.filter((f) => f.status === "blocked").map((f) => f.name).join(", ") || "None"}
          </li>
          <li>
            <span className="text-zinc-600">Risky:</span>{" "}
            {project.ops.riskLevel} · security {stats.securityScore}%
          </li>
          <li>
            <span className="text-zinc-600">World-class move:</span>{" "}
            {project.ops.godModeIdeas[0]?.insight ?? "Run God Mode tab for breakthrough ideas"}
          </li>
        </ul>
      </Card>

      {selectedFeature && (
        <FeatureDetailDrawer
          feature={selectedFeature}
          bots={state.bots}
          getBot={getBot}
          onClose={() => setSelectedFeature(null)}
          onSave={(f) => {
            updateFeature(f);
          }}
        />
      )}

    </div>
  );
}

function Stat({
  label,
  value,
  ok,
  warn,
  danger,
}: {
  label: string;
  value: string;
  ok?: boolean;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-2",
        danger
          ? "border-rose-500/30 bg-rose-500/10"
          : warn
            ? "border-amber-500/30 bg-amber-500/10"
            : ok
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-white/[0.06] bg-white/[0.02]",
      )}
    >
      <p className="text-[10px] uppercase text-zinc-600">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-zinc-200">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs text-zinc-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
