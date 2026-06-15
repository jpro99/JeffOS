"use client";

import { useMissionControl } from "@/lib/store/context";
import { Card, CardTitle } from "@/components/ui/Card";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { BotTypeId, InterfaceId, ModelClassId } from "@/lib/types";
import { JeffOsStructureHint } from "@/components/shared/JeffOsStructureHint";

export default function SettingsPage() {
  const { state, updateSettings, resetData } = useMissionControl();
  const s = state.settings;

  const toggle = (key: keyof typeof s, value?: boolean) => {
    const current = s[key];
    updateSettings({ [key]: value ?? !(current as boolean) } as Partial<typeof s>);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Settings</h1>
        <p className="mt-1 text-zinc-500">Jeff defaults and future integration hooks.</p>
      </div>

      <JeffOsStructureHint />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Experience level</CardTitle>
          <p className="mt-2 text-sm text-zinc-500">
            Controls Classic sidebar. Easy Mode at{" "}
            <a href="/easy" className="text-teal-500 hover:underline">
              /easy
            </a>{" "}
            is the same for all levels — compare both UIs anytime.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["new", "New — minimal Classic nav"],
                ["comfortable", "Comfortable — hide Route/Compose"],
                ["expert", "Expert — everything"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => updateSettings({ experienceLevel: id })}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  s.experienceLevel === id
                    ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/25"
                    : "border border-white/[0.08] text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/easy"
              className="rounded-full bg-teal-500 px-4 py-2 text-sm font-medium text-black"
            >
              Open Easy Mode
            </a>
            <a href="/classic" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400">
              Classic home
            </a>
          </div>
        </Card>

        <Card>
          <CardTitle>Monthly cost alerts</CardTitle>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-zinc-600">Monthly threshold (USD)</label>
              <input
                type="number"
                min={1}
                step={5}
                value={s.monthlyCostThresholdUsd}
                onChange={(e) =>
                  updateSettings({ monthlyCostThresholdUsd: Math.max(1, Number(e.target.value) || 100) })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-zinc-600">Red at or over this amount per project.</p>
            </div>
            <div>
              <label className="text-xs text-zinc-600">Yellow warning at % of threshold</label>
              <input
                type="number"
                min={50}
                max={99}
                value={s.costWarningPercent}
                onChange={(e) =>
                  updateSettings({
                    costWarningPercent: Math.min(99, Math.max(50, Number(e.target.value) || 80)),
                  })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-zinc-600">
                Example: 80% of ${s.monthlyCostThresholdUsd} = yellow at $
                {Math.round(s.monthlyCostThresholdUsd * (s.costWarningPercent / 100))}/mo
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Project discovery</CardTitle>
          <div className="mt-4 space-y-3">
            <ToggleRow
              label="Auto-scan on load"
              checked={s.autoDiscoverProjects}
              onChange={() => toggle("autoDiscoverProjects")}
            />
            <ToggleRow
              label="Include unknown folders"
              checked={s.discoverUnknownFolders}
              onChange={() => toggle("discoverUnknownFolders")}
            />
            <div>
              <label className="text-xs text-zinc-600">Scan roots (one per line)</label>
              <textarea
                value={s.projectsRoots.join("\n")}
                onChange={(e) =>
                  updateSettings({
                    projectsRoots: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean),
                  })
                }
                rows={3}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#12141a] px-3 py-2 font-mono text-xs text-zinc-300"
              />
            </div>
            <p className="text-xs text-zinc-600">
              {s.lastDiscoveryCount} projects · last scan{" "}
              {s.lastDiscoveryAt ? <RelativeTime iso={s.lastDiscoveryAt} mode="datetime" /> : "never"}
            </p>
          </div>
        </Card>

        <Card>
          <CardTitle>Voice control</CardTitle>
          <div className="mt-4 space-y-3">
            <ToggleRow label="Voice enabled" checked={s.voiceEnabled} onChange={() => toggle("voiceEnabled")} />
            <ToggleRow
              label="Spoken confirmations (TTS)"
              checked={s.voiceResponseEnabled}
              onChange={() => toggle("voiceResponseEnabled")}
            />
            <div>
              <label className="text-xs text-zinc-600">Voice mode</label>
              <select
                value={s.voiceMode}
                onChange={(e) =>
                  updateSettings({ voiceMode: e.target.value as typeof s.voiceMode })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
              >
                <option value="push-to-talk">Push to talk (hold mic)</option>
                <option value="tap-to-talk">Tap to talk</option>
              </select>
            </div>
            <p className="text-xs text-zinc-600">
              Mic permission: {state.workspace.voice.micPermissionState}. Uses browser speech — server transcription later.
            </p>
          </div>
        </Card>

        <Card>
          <CardTitle>Jeff mode</CardTitle>
          <div className="mt-4 space-y-3">
            <ToggleRow label="Caveman default" checked={s.cavemanDefault} onChange={() => toggle("cavemanDefault")} />
            <ToggleRow label="Cost-save mode" checked={s.costSaveMode} onChange={() => toggle("costSaveMode")} />
            <ToggleRow label="Auto-route tasks" checked={s.autoRoute} onChange={() => toggle("autoRoute")} />
            <ToggleRow label="Compact sidebar" checked={s.compactMode} onChange={() => toggle("compactMode")} />
            <ToggleRow label="Mobile / compact UI" checked={s.mobileMode} onChange={() => toggle("mobileMode")} />
          </div>
        </Card>

        <Card>
          <CardTitle>Defaults</CardTitle>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-zinc-600">Default interface</label>
              <select
                value={s.defaultInterface}
                onChange={(e) => updateSettings({ defaultInterface: e.target.value as InterfaceId })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
              >
                {state.interfaces.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-600">Preferred model class</label>
              <select
                value={s.preferredModelClass}
                onChange={(e) => updateSettings({ preferredModelClass: e.target.value as ModelClassId })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
              >
                {state.modelClasses.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-600">Preferred bot sequence</label>
              <p className="mt-2 text-sm text-zinc-500">
                {s.preferredBotSequence.map((b) => b.replace(/-/g, " ")).join(" → ")}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Future integrations (placeholders)</CardTitle>
          <ul className="mt-4 space-y-2 text-sm text-zinc-500">
            <li className="rounded-lg bg-white/[0.02] px-3 py-2">○ Cursor session launcher</li>
            <li className="rounded-lg bg-white/[0.02] px-3 py-2">○ Claude Code CLI bridge</li>
            <li className="rounded-lg bg-white/[0.02] px-3 py-2">○ Repo scan / git status sync</li>
            <li className="rounded-lg bg-white/[0.02] px-3 py-2">○ Real model provider + cost tracking</li>
            <li className="rounded-lg bg-white/[0.02] px-3 py-2">○ Jeff OS docs file sync</li>
            <li className="rounded-lg bg-white/[0.02] px-3 py-2">○ Activity log from agent runs</li>
          </ul>
        </Card>

        <Card>
          <CardTitle>Data</CardTitle>
          <p className="mt-2 text-sm text-zinc-500">
            Local-first. State in <code className="text-teal-700">jeff-mission-control-v8</code>.
          </p>
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset all data to seed defaults?")) resetData();
            }}
            className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-300"
          >
            Reset to seed data
          </button>
        </Card>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3">
      <span className="text-sm text-zinc-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-teal-500/40" : "bg-zinc-700"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-5" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}
