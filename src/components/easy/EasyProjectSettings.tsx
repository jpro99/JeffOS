"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BotDefinition, Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { ensureOrchestration } from "@/lib/orchestration/defaults";
import {
  copySettingsToProject,
  extractSettingsPacket,
} from "@/lib/mission/project-settings-packet";
import {
  applyBotsToProject,
  botsLineupMatchesSuggestion,
  intakeFromProject,
  recommendBuildMode,
  redoScopeFromMission,
  suggestBotsForProject,
  type BuildMode,
} from "@/lib/mission/suggest-project-bots";
import { BUILD_MODES } from "@/lib/mission/new-project-wizard";
import { recommendScope } from "@/lib/mission/tech-recommendations";
import { ProjectFolderBanner } from "@/components/shared/ProjectFolderBanner";
import { GodModePanel } from "@/components/workspace/GodModePanel";
import { cn, copyToClipboard } from "@/lib/utils";

const INTERFACES: Project["preferredInterface"][] = [
  "cursor",
  "claude-code",
  "regular-claude",
  "future-custom",
];
const MODELS: Project["preferredModelClass"][] = [
  "cheap-fast",
  "balanced",
  "deep-reasoning",
  "code-heavy",
  "review-heavy",
  "planning-heavy",
  "long-context",
  "autonomous-heavy",
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      {hint && <span className="block text-[10px] text-zinc-600">{hint}</span>}
      {children}
    </label>
  );
}

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function arrayToLines(items: string[]): string {
  return items.join("\n");
}

export function EasyProjectSettings({ project }: { project: Project }) {
  const { state, updateProject, addActivity } = useMissionControl();
  const live = state.projects.find((p) => p.id === project.id) ?? project;
  const orch = ensureOrchestration(live);

  const godBots = useMemo(
    () => state.bots.filter((b) => b.type === "project-god-bot" || b.type === "control-tower"),
    [state.bots],
  );
  const workerBots = useMemo(
    () => state.bots.filter((b) => b.type !== "project-god-bot" && b.type !== "control-tower"),
    [state.bots],
  );

  const [copyTargetId, setCopyTargetId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [buildMode, setBuildMode] = useState<BuildMode>(
    () => orch.botSuggestion?.buildMode ?? recommendBuildMode(live),
  );
  const [showAdvancedBots, setShowAdvancedBots] = useState(false);

  const liveRec = useMemo(() => {
    const intake = intakeFromProject(live);
    return intake.pitch.trim().length > 3 || intake.description.trim().length > 3
      ? recommendScope(intake)
      : null;
  }, [live]);

  const botSuggestion = useMemo(
    () => suggestBotsForProject(live, state.bots, buildMode),
    [live, state.bots, buildMode],
  );

  const botsApplied = useMemo(
    () => botsLineupMatchesSuggestion(live, state.bots, buildMode),
    [live, state.bots, buildMode],
  );

  const save = (next: Project) => {
    updateProject({ ...next, lastUpdated: new Date().toISOString() });
  };

  const patchScope = (patch: Partial<typeof orch.scope>) => {
    save({
      ...live,
      orchestration: {
        ...orch,
        scope: { ...orch.scope, ...patch, updatedAt: new Date().toISOString() },
      },
    });
  };

  const toggleWorker = (botId: string) => {
    const set = new Set(live.workerBotIds);
    if (set.has(botId)) set.delete(botId);
    else set.add(botId);
    save({ ...live, workerBotIds: [...set] });
  };

  const exportJson = async () => {
    const json = JSON.stringify(extractSettingsPacket(live), null, 2);
    const ok = await copyToClipboard(json);
    setMsg(ok ? "Settings copied as JSON — paste into another project or save in a file" : "Copy failed");
  };

  const applyCopy = () => {
    if (!copyTargetId || copyTargetId === live.id) {
      setMsg("Pick a different project to copy into");
      return;
    }
    const target = state.projects.find((p) => p.id === copyTargetId);
    if (!target) return;
    const merged = copySettingsToProject(live, target);
    updateProject(merged);
    addActivity(`Copied settings from ${live.name} → ${target.name}`, "project", target.id);
    setMsg(`Copied mission + bots into ${target.name}`);
  };

  const redoScope = () => {
    const next = redoScopeFromMission(live);
    save(next);
    setMsg("Scope refreshed from your mission — tech, timeline, and goals updated");
  };

  const applySuggestedBots = () => {
    const next = applyBotsToProject(live, state.bots, buildMode);
    save(next);
    setBuildMode(next.orchestration?.botSuggestion?.buildMode ?? buildMode);
    addActivity(`Applied suggested bots (${buildMode}) for ${live.name}`, "project", live.id);
    const workerCount = next.workerBotIds.length;
    setMsg(
      `Applied ${botSuggestion.godBotName} + ${workerCount} worker bot${workerCount === 1 ? "" : "s"} in one tap — all set.`,
    );
  };

  const updateFullScope = (text: string) => {
    const firstLine = text.split("\n").find((l) => l.trim())?.trim() ?? "";
    save({
      ...live,
      description: text,
      orchestration: {
        ...orch,
        scope: {
          ...orch.scope,
          pitch: firstLine.slice(0, 160) || orch.scope.pitch,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  };

  const fullScope = live.description.trim() || orch.scope.pitch;

  return (
    <div className="space-y-6 pb-32">
      <div>
        <Link href={`/easy/projects/${live.id}`} className="text-sm text-zinc-600 hover:text-teal-500">
          ← Back to work
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-50">{live.name} — Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Everything for this folder only — mission, bots, God Mode. Other projects keep their own settings.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Mission — what this project is</h2>
            <p className="mt-1 text-xs text-zinc-600">
              Filled from when you created the project. Edit anytime or redo scope below.
            </p>
          </div>
          <button
            type="button"
            onClick={redoScope}
            className="rounded-full border border-teal-500/30 px-4 py-2 text-xs font-medium text-teal-300 hover:bg-teal-500/10"
          >
            Redo scope from mission
          </button>
        </div>
        <Field
          label="Everything you want to build"
          hint="Say it all here — Jeff OS uses this for bot suggestions and scope"
        >
          <textarea
            value={fullScope}
            onChange={(e) => updateFullScope(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
            placeholder="This is what I wanna do — full scope, users, features, platforms…"
          />
        </Field>
        <Field label="One-line mission" hint="Short headline — auto-filled from first line above">
          <input
            value={orch.scope.pitch}
            onChange={(e) => patchScope({ pitch: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
            placeholder="Bankruptcy platform for attorneys…"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={live.description}
            onChange={(e) => save({ ...live, description: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
          />
        </Field>
        <Field label="Goals — one per line" hint="From project creation — edit or redo scope to refresh">
          <textarea
            value={arrayToLines(live.goals)}
            onChange={(e) => save({ ...live, goals: linesToArray(e.target.value) })}
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
          />
        </Field>
        {liveRec && (
          <div className="space-y-3 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400/90">
              Scope preview from your mission
            </p>
            <div>
              <p className="text-xs font-medium text-zinc-400">Recommended tech</p>
              <ul className="mt-1 space-y-1">
                {liveRec.techLines.map((line) => (
                  <li key={line} className="text-xs text-zinc-300">
                    · {line}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400">Timeline</p>
              <p className="mt-1 text-xs text-zinc-300">{liveRec.timeline}</p>
            </div>
          </div>
        )}
        <Field label="Who uses it">
          <input
            value={orch.scope.targetUsers}
            onChange={(e) => patchScope({ targetUsers: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
          />
        </Field>
        <Field label="Tech stack preference">
          <input
            value={orch.scope.techPreferences}
            onChange={(e) => patchScope({ techPreferences: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
          />
        </Field>
        <Field label="Roadmap — one step per line">
          <textarea
            value={arrayToLines(live.roadmap)}
            onChange={(e) => save({ ...live, roadmap: linesToArray(e.target.value) })}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
          />
        </Field>
        <Field label="Risks — one per line">
          <textarea
            value={arrayToLines(live.risks)}
            onChange={(e) => save({ ...live, risks: linesToArray(e.target.value) })}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
          />
        </Field>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h2 className="text-base font-semibold text-zinc-100">Folder on your PC</h2>
        <ProjectFolderBanner project={live} collapseWhenLinked />
      </section>

      <section className="space-y-4 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-5">
        <div>
          <h2 className="text-base font-semibold text-violet-100">Suggested bots for this project</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Jeff OS picks the right God Bot and workers from your mission — not generic defaults. One tap to apply.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-300">Build mode</p>
          <p className="mt-1 text-[10px] text-zinc-600">
            Recommended:{" "}
            <span className="text-teal-500/90">
              {BUILD_MODES.find((m) => m.id === botSuggestion.recommendedBuildMode)?.label}
            </span>
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {BUILD_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setBuildMode(mode.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  buildMode === mode.id
                    ? "border-teal-500/40 bg-teal-500/10 ring-1 ring-teal-500/25"
                    : "border-white/[0.08] bg-black/20 hover:border-white/15",
                )}
              >
                <p className="text-sm font-semibold text-zinc-100">{mode.label}</p>
                <p className="mt-1 text-[10px] text-teal-600/90">{mode.tagline}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/80">
            Suggested for {live.name}
          </p>
          <h3 className="mt-2 text-sm font-semibold text-zinc-100">{botSuggestion.headline}</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{botSuggestion.approach}</p>
          <ul className="mt-4 space-y-2">
            {botSuggestion.botCards.map((card) => (
              <li
                key={`${card.botId}-${card.role}`}
                className={cn(
                  "rounded-xl border px-3 py-2.5",
                  card.isGodBot
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-white/[0.06] bg-black/20",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {card.isGodBot ? "God Bot — " : ""}
                      {card.botName}
                    </p>
                    <p className="text-[10px] text-zinc-600">{card.role}</p>
                  </div>
                  {card.isGodBot && (
                    <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-semibold uppercase text-amber-200">
                      Suggested
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">{card.why}</p>
                {card.featureNames.length > 0 && (
                  <p className="mt-1 text-[10px] text-teal-700/80">
                    → {card.featureNames.join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {botSuggestion.featureNames.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] uppercase text-zinc-600">Features this lineup covers</p>
              <p className="mt-1 text-xs text-zinc-400">{botSuggestion.featureNames.join(" · ")}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applySuggestedBots}
            disabled={botsApplied}
            className={cn(
              "rounded-full px-5 py-2.5 text-sm font-semibold",
              botsApplied
                ? "cursor-default bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30"
                : "bg-teal-500 text-black hover:bg-teal-400",
            )}
          >
            {botsApplied
              ? `All bots applied (${botSuggestion.workerBotIds.length + 1} total)`
              : `Apply all suggested bots (${botSuggestion.botCards.length})`}
          </button>
          <p className="self-center text-xs text-zinc-600">
            {botsApplied ? (
              <span className="text-emerald-400/90">Lineup saved — no need to tap each worker below.</span>
            ) : (
              <>
                One tap sets God Bot + every worker in the list above. Current:{" "}
                {godBots.find((b) => b.id === live.assignedGodBotId)?.name ?? "—"} · {live.workerBotIds.length}{" "}
                workers
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvancedBots((v) => !v)}
          className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
        >
          {showAdvancedBots ? "Hide advanced bot picker" : "Advanced — pick your own bots"}
        </button>

        {showAdvancedBots && (
          <div className="space-y-4 border-t border-white/[0.06] pt-4">
            <Field label="God Bot (override)">
              <select
                value={live.assignedGodBotId}
                onChange={(e) => save({ ...live, assignedGodBotId: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
              >
                {godBots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.id === botSuggestion.godBotId ? " (suggested)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Voice for this project">
              <select
                value={live.jeffMode}
                onChange={(e) => save({ ...live, jeffMode: e.target.value as Project["jeffMode"] })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
              >
                <option value="caveman">Caveman — short, direct</option>
                <option value="normal">Normal</option>
              </select>
            </Field>
            <Field label="Bot strategy note" hint="How bots should split work on this repo">
              <textarea
                value={live.activeBotStrategy}
                onChange={(e) => save({ ...live, activeBotStrategy: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
              />
            </Field>
            <Field label="Default tool">
              <select
                value={live.preferredInterface}
                onChange={(e) =>
                  save({ ...live, preferredInterface: e.target.value as Project["preferredInterface"] })
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
              >
                {INTERFACES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Default model strength">
              <select
                value={live.preferredModelClass}
                onChange={(e) =>
                  save({ ...live, preferredModelClass: e.target.value as Project["preferredModelClass"] })
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <p className="text-xs font-medium text-zinc-300">Worker bots on this project</p>
              <p className="mt-1 text-[10px] text-zinc-600">Tap to turn on/off for build prompts</p>
              <ul className="mt-3 space-y-2">
                {workerBots.map((b: BotDefinition) => {
                  const on = live.workerBotIds.includes(b.id);
                  const suggested = botSuggestion.workerBotIds.includes(b.id);
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => toggleWorker(b.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition",
                          on
                            ? "border-teal-500/30 bg-teal-500/10 text-teal-100"
                            : "border-white/[0.06] bg-black/20 text-zinc-500",
                        )}
                      >
                        <span>
                          {b.name}
                          {suggested && !on && (
                            <span className="ml-2 text-[10px] text-violet-400">suggested</span>
                          )}
                        </span>
                        <span className="text-[10px]">{on ? "ON" : "off"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <Field label="God Bot doc file" hint="Under docs/command-center/projects/">
              <input
                value={live.godBotFile ?? ""}
                onChange={(e) => save({ ...live, godBotFile: e.target.value || undefined })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-xs text-zinc-200"
                placeholder="projects/my-bankruptcy.md"
              />
            </Field>
          </div>
        )}
      </section>

      <GodModePanel project={live} />

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h2 className="text-base font-semibold text-zinc-100">Copy settings to another project</h2>
        <p className="text-sm text-zinc-500">
          Copies mission, goals, bots, and scope — not folder path or errors.
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={copyTargetId}
            onChange={(e) => setCopyTargetId(e.target.value)}
            className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-200"
          >
            <option value="">Pick project…</option>
            {state.projects
              .filter((p) => p.id !== live.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={applyCopy}
            className="rounded-full bg-teal-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
          >
            Copy into project
          </button>
          <button
            type="button"
            onClick={() => void exportJson()}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-zinc-400"
          >
            Copy as JSON
          </button>
        </div>
      </section>

      {msg && <p className="text-sm text-teal-400">{msg}</p>}
    </div>
  );
}
