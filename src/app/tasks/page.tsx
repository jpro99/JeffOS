"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMissionControl } from "@/lib/store/context";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { RoutingRecommendation } from "@/components/routing/RoutingRecommendation";
import { priorityColors, statusColors, uid } from "@/lib/utils";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { computeRouting } from "@/lib/routing/engine";
import type { Task, TaskStatus, TaskTypeId, TaskSize, Priority } from "@/lib/types";

function TasksContent() {
  const searchParams = useSearchParams();
  const { state, updateTask, addTask, addRoutingHistory, addActivity } = useMissionControl();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>(searchParams.get("project") ?? "all");
  const [selected, setSelected] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    projectId: state.projects[0]?.id ?? "",
    title: "",
    description: "",
    taskType: "feature" as TaskTypeId,
    taskSize: "medium" as TaskSize,
    priority: "P2" as Priority,
  });

  const filtered = useMemo(() => {
    return state.tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (projectFilter !== "all" && t.projectId !== projectFilter) return false;
      return true;
    });
  }, [state.tasks, statusFilter, projectFilter]);

  const createTask = () => {
    const project = state.projects.find((p) => p.id === form.projectId);
    const route = computeRouting({
      taskType: form.taskType,
      taskSize: form.taskSize,
      optimizeFor: "speed",
      autonomyLevel: "medium",
      riskLevel: "medium",
      costSensitivity: state.settings.costSaveMode ? "high" : "medium",
      project,
      settings: state.settings,
      presets: state.routingPresets,
      bots: state.bots,
    });
    const task: Task = {
      id: uid("task"),
      projectId: form.projectId,
      title: form.title || "Untitled task",
      description: form.description,
      taskType: form.taskType,
      taskSize: form.taskSize,
      status: "ready",
      priority: form.priority,
      selectedBotId: route.botId,
      selectedInterface: route.interface,
      selectedModelClass: route.modelClass,
      recommendedRoute: route,
      routingMode: state.settings.autoRoute ? "auto" : "manual",
      generatedPrompt: `Task: ${form.title}\nRoute: ${route.interface} / ${route.botType}`,
      resultNotes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addTask(task);
    addRoutingHistory({
      id: uid("rh"),
      projectId: form.projectId,
      taskId: task.id,
      decision: route,
      mode: task.routingMode,
      createdAt: new Date().toISOString(),
      label: task.title,
    });
    addActivity(`Created task: ${task.title}`, "task", form.projectId);
    setShowCreate(false);
    setSelected(task);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Tasks</h1>
          <p className="mt-1 text-zinc-500">Track work, routing, and prompts.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-teal-500/15 px-4 py-2 text-sm text-teal-200 ring-1 ring-teal-500/30"
        >
          + New task
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#12141a] px-3 py-2 text-sm text-zinc-300"
        >
          <option value="all">All projects</option>
          {state.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#12141a] px-3 py-2 text-sm text-zinc-300"
        >
          <option value="all">All statuses</option>
          {(["planned", "ready", "running", "blocked", "review", "done"] as TaskStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {filtered.map((task) => {
            const project = state.projects.find((p) => p.id === task.projectId);
            return (
              <Card
                key={task.id}
                onClick={() => setSelected(task)}
                className={`cursor-pointer p-4 ${selected?.id === task.id ? "border-teal-500/30" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-100">{task.title}</p>
                    <p className="text-sm text-zinc-500">{project?.name} · {task.taskType}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                    <Badge className={statusColors[task.status]}>{task.status}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                  <span>{task.selectedInterface}</span>
                  <span>·</span>
                  <span>{task.selectedModelClass}</span>
                  <span>·</span>
                  <span>{task.routingMode}</span>
                  <span>·</span>
                  <RelativeTime iso={task.updatedAt} />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          {selected ? (
            <>
              <Card>
                <h2 className="font-semibold text-zinc-100">{selected.title}</h2>
                <p className="mt-2 text-sm text-zinc-500">{selected.description}</p>
                <label className="mt-4 block text-xs text-zinc-600">Status</label>
                <select
                  value={selected.status}
                  onChange={(e) =>
                    updateTask({
                      ...selected,
                      status: e.target.value as TaskStatus,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
                >
                  {(["planned", "ready", "running", "blocked", "review", "done"] as TaskStatus[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <label className="mt-3 block text-xs text-zinc-600">Result notes</label>
                <textarea
                  value={selected.resultNotes}
                  onChange={(e) =>
                    updateTask({ ...selected, resultNotes: e.target.value, updatedAt: new Date().toISOString() })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#12141a] px-3 py-2 text-sm text-zinc-300"
                />
                <div className="mt-3">
                  <CopyButton text={selected.generatedPrompt} label="Copy prompt" />
                </div>
              </Card>
              <RoutingRecommendation decision={selected.recommendedRoute} mode={selected.routingMode} compact />
            </>
          ) : (
            <Card><p className="text-sm text-zinc-500">Select a task.</p></Card>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-lg">
            <h2 className="text-lg font-semibold">New task</h2>
            <div className="mt-4 space-y-3">
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
              >
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.taskType}
                  onChange={(e) => setForm({ ...form, taskType: e.target.value as TaskTypeId })}
                  className="rounded-lg border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
                >
                  {(["feature", "bugfix", "planning", "refactor", "test", "review", "deploy", "security", "ux"] as TaskTypeId[]).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                  className="rounded-lg border border-white/10 bg-[#12141a] px-3 py-2 text-sm"
                >
                  {(["P0", "P1", "P2", "P3"] as Priority[]).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-zinc-500">Cancel</button>
              <button type="button" onClick={createTask} className="rounded-lg bg-teal-500/20 px-4 py-2 text-sm text-teal-200">Create + route</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500">Loading tasks…</div>}>
      <TasksContent />
    </Suspense>
  );
}
