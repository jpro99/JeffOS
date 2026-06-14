"use client";

import { useMemo, useState } from "react";
import { useMissionControl } from "@/lib/store/context";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { getInterfaceLabel, getModelLabel } from "@/lib/routing/engine";

const groups = [
  { id: "control", label: "Control Tower" },
  { id: "project", label: "Project God Bots" },
  { id: "worker", label: "Worker Bots" },
] as const;

export default function BotsPage() {
  const { state } = useMissionControl();
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return state.bots;
    return state.bots.filter((b) => b.group === filter);
  }, [state.bots, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Bots</h1>
        <p className="mt-1 text-zinc-500">{state.bots.length} agents in the fleet.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-sm ${filter === "all" ? "bg-teal-500/15 text-teal-200" : "text-zinc-500"}`}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setFilter(g.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${filter === g.id ? "bg-teal-500/15 text-teal-200" : "text-zinc-500"}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((bot) => {
          const projects = state.projects.filter((p) => bot.projectIds.includes(p.id));
          const open = expanded === bot.id;
          return (
            <Card key={bot.id} glow={bot.group === "control"}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{bot.name}</CardTitle>
                  <p className="mt-1 text-xs uppercase tracking-wider text-zinc-600">{bot.role}</p>
                </div>
                <Badge className="border-white/10 bg-white/5 text-zinc-500">{bot.type.replace(/-/g, " ")}</Badge>
              </div>
              <p className="mt-3 text-sm text-zinc-500">{bot.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                <span>{getInterfaceLabel(bot.preferredInterface, state.interfaces)}</span>
                <span>·</span>
                <span>{getModelLabel(bot.preferredModelClass, state.modelClasses)}</span>
              </div>
              {projects.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {projects.map((p) => (
                    <Badge key={p.id} className="border-teal-500/10 bg-teal-500/5 text-teal-700">{p.name}</Badge>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setExpanded(open ? null : bot.id)}
                className="mt-4 text-sm text-teal-400"
              >
                {open ? "Hide prompt" : "Preview prompt"}
              </button>
              {open && (
                <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-zinc-400 whitespace-pre-wrap">
                  {bot.promptPreview}
                </pre>
              )}
              <div className="mt-4 flex gap-2">
                <CopyButton text={bot.promptPreview} label="Launch / Copy" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
