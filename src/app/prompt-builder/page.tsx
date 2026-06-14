"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMissionControl } from "@/lib/store/context";
import { Card, CardTitle } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { RoutingRecommendation } from "@/components/routing/RoutingRecommendation";
import { buildPromptPackets } from "@/lib/routing/prompts";
import type {
  AutonomyLevel,
  CostSensitivity,
  OptimizeFor,
  PromptBuilderInput,
  RiskLevel,
  TaskSize,
  TaskTypeId,
} from "@/lib/types";

const defaults: Omit<PromptBuilderInput, "projectId"> = {
  taskType: "feature",
  goal: "",
  constraints: "Minimal diff. Match repo conventions.",
  optimizeFor: "speed",
  autonomyLevel: "medium",
  riskLevel: "medium",
  costSensitivity: "medium",
  taskSize: "medium",
  requestedOutput: "Working code + verify steps",
};

function PromptBuilderContent() {
  const searchParams = useSearchParams();
  const { state } = useMissionControl();
  const initialProject = searchParams.get("project") ?? state.projects[0]?.id ?? "";

  const [input, setInput] = useState<PromptBuilderInput>({
    ...defaults,
    projectId: initialProject,
  });

  const output = useMemo(() => buildPromptPackets(input, state), [input, state]);

  const field = (
    label: string,
    key: keyof PromptBuilderInput,
    type: "text" | "textarea" | "select" = "text",
    options?: { value: string; label: string }[],
  ) => (
    <div>
      <label className="text-xs uppercase tracking-wider text-zinc-600">{label}</label>
      {type === "textarea" ? (
        <textarea
          value={String(input[key])}
          onChange={(e) => setInput({ ...input, [key]: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#12141a] px-3 py-2 text-sm text-zinc-300"
        />
      ) : type === "select" && options ? (
        <select
          value={String(input[key])}
          onChange={(e) => setInput({ ...input, [key]: e.target.value as never })}
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#12141a] px-3 py-2 text-sm text-zinc-300"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          value={String(input[key])}
          onChange={(e) => setInput({ ...input, [key]: e.target.value })}
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#12141a] px-3 py-2 text-sm text-zinc-300"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Prompt Builder</h1>
        <p className="mt-1 text-zinc-500">Form → packets. No typing from scratch.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle>Inputs</CardTitle>
          <div className="mt-4 space-y-4">
            {field(
              "Project",
              "projectId",
              "select",
              state.projects.map((p) => ({ value: p.id, label: p.name })),
            )}
            {field("Task type", "taskType", "select", [
              { value: "planning", label: "Planning" },
              { value: "architecture", label: "Architecture" },
              { value: "feature", label: "Feature" },
              { value: "bugfix", label: "Bug fix" },
              { value: "refactor", label: "Refactor" },
              { value: "test", label: "Test" },
              { value: "review", label: "Review" },
              { value: "deploy", label: "Deploy" },
              { value: "security", label: "Security" },
              { value: "ux", label: "UX" },
              { value: "prompt", label: "Prompt" },
            ])}
            {field("Goal", "goal", "textarea")}
            {field("Constraints", "constraints", "textarea")}
            {field("Optimize for", "optimizeFor", "select", [
              { value: "speed", label: "Speed" },
              { value: "cost", label: "Cost" },
              { value: "quality", label: "Quality" },
              { value: "autonomy", label: "Autonomy" },
            ])}
            <div className="grid grid-cols-2 gap-3">
              {field("Autonomy", "autonomyLevel", "select", [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ])}
              {field("Risk", "riskLevel", "select", [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ])}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("Cost sensitivity", "costSensitivity", "select", [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ])}
              {field("Task size", "taskSize", "select", [
                { value: "tiny", label: "Tiny" },
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "large", label: "Large" },
                { value: "epic", label: "Epic" },
              ])}
            </div>
            {field("Requested output", "requestedOutput", "textarea")}
          </div>
        </Card>

        <div className="space-y-4">
          <RoutingRecommendation decision={output.routing} mode={state.settings.autoRoute ? "auto" : "manual"} />

          {[
            { title: "Control Tower packet", text: output.controlTowerPacket },
            { title: "Project God Bot packet", text: output.godBotPacket },
            { title: "Worker prompt", text: output.workerPrompt },
          ].map((block) => (
            <Card key={block.title}>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{block.title}</CardTitle>
                <CopyButton text={block.text} compact />
              </div>
              <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-zinc-400 whitespace-pre-wrap">
                {block.text}
              </pre>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PromptBuilderPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500">Loading…</div>}>
      <PromptBuilderContent />
    </Suspense>
  );
}
