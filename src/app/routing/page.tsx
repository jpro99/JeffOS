"use client";

import { useMemo, useState } from "react";
import { useMissionControl } from "@/lib/store/context";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RoutingRecommendation } from "@/components/routing/RoutingRecommendation";
import { computeRouting } from "@/lib/routing/engine";
import { uid } from "@/lib/utils";
import type {
  AutonomyLevel,
  BotTypeId,
  CostSensitivity,
  InterfaceId,
  ModelClassId,
  OptimizeFor,
  RiskLevel,
  TaskSize,
  TaskTypeId,
} from "@/lib/types";

export default function RoutingCenterPage() {
  const { state, addPreset, addRoutingHistory, addActivity, updateProject } = useMissionControl();

  const [input, setInput] = useState({
    projectId: state.projects[0]?.id ?? "",
    taskType: "feature" as TaskTypeId,
    taskSize: "medium" as TaskSize,
    optimizeFor: "speed" as OptimizeFor,
    autonomyLevel: "medium" as AutonomyLevel,
    riskLevel: "medium" as RiskLevel,
    costSensitivity: "medium" as CostSensitivity,
  });

  const [manual, setManual] = useState(false);
  const [override, setOverride] = useState({
    interface: "cursor" as InterfaceId,
    botType: "builder-bot" as BotTypeId,
    modelClass: "balanced" as ModelClassId,
  });

  const [presetName, setPresetName] = useState("");

  const autoDecision = useMemo(() => {
    const project = state.projects.find((p) => p.id === input.projectId);
    return computeRouting({
      ...input,
      project,
      settings: state.settings,
      presets: state.routingPresets,
      bots: state.bots,
    });
  }, [input, state.settings, state.routingPresets, state.bots]);

  const decision = manual
    ? {
        ...autoDecision,
        interface: override.interface,
        botType: override.botType,
        modelClass: override.modelClass,
        botId: state.bots.find((b) => b.type === override.botType)?.id ?? autoDecision.botId,
        reasons: ["Manual override active", ...autoDecision.reasons.slice(0, 2)],
        confidence: 1,
      }
    : autoDecision;

  const savePreset = () => {
    if (!presetName.trim()) return;
    addPreset({
      id: uid("preset"),
      name: presetName,
      taskType: input.taskType,
      projectId: input.projectId,
      interface: decision.interface,
      botType: decision.botType,
      modelClass: decision.modelClass,
    });
    addActivity(`Saved routing preset: ${presetName}`, "routing", input.projectId);
    setPresetName("");
  };

  const saveProjectPrefs = () => {
    const project = state.projects.find((p) => p.id === input.projectId);
    if (!project) return;
    updateProject({
      ...project,
      preferredInterface: decision.interface,
      preferredModelClass: decision.modelClass,
      lastUpdated: new Date().toISOString(),
    });
    addActivity(`Updated project routing prefs: ${project.name}`, "project", project.id);
  };

  const logRoute = () => {
    addRoutingHistory({
      id: uid("rh"),
      projectId: input.projectId,
      decision,
      mode: manual ? "manual" : "auto",
      createdAt: new Date().toISOString(),
      label: `${input.taskType} route`,
    });
    addActivity("Logged routing decision", "routing", input.projectId);
  };

  const selectClass = "mt-1 w-full rounded-xl border border-white/10 bg-[#12141a] px-3 py-2 text-sm text-zinc-300";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Routing Center</h1>
        <p className="mt-1 text-zinc-500">Best interface · bot · model class — with reasons.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardTitle>Scenario</CardTitle>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-zinc-600">Project</label>
              <select
                value={input.projectId}
                onChange={(e) => setInput({ ...input, projectId: e.target.value })}
                className={selectClass}
              >
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-600">Task type</label>
              <select
                value={input.taskType}
                onChange={(e) => setInput({ ...input, taskType: e.target.value as TaskTypeId })}
                className={selectClass}
              >
                {(["planning", "feature", "bugfix", "refactor", "test", "review", "deploy", "security", "ux", "audit"] as TaskTypeId[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-600">Size</label>
                <select
                  value={input.taskSize}
                  onChange={(e) => setInput({ ...input, taskSize: e.target.value as TaskSize })}
                  className={selectClass}
                >
                  {(["tiny", "small", "medium", "large", "epic"] as TaskSize[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-600">Optimize</label>
                <select
                  value={input.optimizeFor}
                  onChange={(e) => setInput({ ...input, optimizeFor: e.target.value as OptimizeFor })}
                  className={selectClass}
                >
                  <option value="speed">Speed</option>
                  <option value="cost">Cost</option>
                  <option value="quality">Quality</option>
                  <option value="autonomy">Autonomy</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
              Manual override
            </label>
            {manual && (
              <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <select
                  value={override.interface}
                  onChange={(e) => setOverride({ ...override, interface: e.target.value as InterfaceId })}
                  className={selectClass}
                >
                  {state.interfaces.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
                <select
                  value={override.botType}
                  onChange={(e) => setOverride({ ...override, botType: e.target.value as BotTypeId })}
                  className={selectClass}
                >
                  {[...new Set(state.bots.map((b) => b.type))].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={override.modelClass}
                  onChange={(e) => setOverride({ ...override, modelClass: e.target.value as ModelClassId })}
                  className={selectClass}
                >
                  {state.modelClasses.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-2">
          <RoutingRecommendation decision={decision} mode={manual ? "manual" : "auto"} />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={logRoute}
              className="rounded-xl bg-teal-500/15 px-4 py-2 text-sm text-teal-200 ring-1 ring-teal-500/30"
            >
              Log decision
            </button>
            <button
              type="button"
              onClick={saveProjectPrefs}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300"
            >
              Save to project prefs
            </button>
          </div>

          <Card>
            <CardTitle>Save preset</CardTitle>
            <div className="mt-3 flex gap-2">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name"
                className="flex-1 rounded-lg border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
              />
              <button type="button" onClick={savePreset} className="rounded-lg bg-white/5 px-4 py-2 text-sm text-zinc-300">
                Save
              </button>
            </div>
          </Card>

          <Card>
            <CardTitle>Interface guide</CardTitle>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {state.interfaces.map((i) => (
                <div key={i.id} className="rounded-xl bg-white/[0.02] p-3">
                  <p className="font-medium text-zinc-200">{i.icon} {i.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">{i.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Saved presets</h2>
        <div className="flex flex-wrap gap-2">
          {state.routingPresets.map((p) => (
            <Badge key={p.id} className="border-teal-500/20 bg-teal-500/5 px-3 py-2 text-teal-300">
              {p.name}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Routing history</h2>
        <div className="space-y-2">
          {state.routingHistory.slice(0, 8).map((h) => (
            <Card key={h.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-zinc-300">{h.label}</p>
                <Badge className="border-white/10 bg-white/5 text-zinc-500">{h.mode}</Badge>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                {h.decision.interface} · {h.decision.botType} · {h.decision.modelClass}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
