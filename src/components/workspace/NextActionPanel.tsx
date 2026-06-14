"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Badge } from "@/components/ui/Badge";
import { QuickCommands } from "@/components/workspace/QuickCommands";

export function NextActionPanel({ project }: { project: Project }) {
  const [copied, setCopied] = useState(false);
  const na = project.ops.nextAction;

  const primary = [
    "continue-build",
    "fix-next-issue",
    "strengthen-security",
    "prepare-launch",
    "god-mode",
  ] as const;

  return (
    <Card glow className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-teal-700">Next best action</p>
        <CardTitle className="mt-1 text-lg">{na.title}</CardTitle>
        <p className="mt-2 text-sm text-zinc-500">{na.whyItMatters}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge className="border-white/10 bg-white/5 text-zinc-400">Milestone: {na.milestone}</Badge>
        <Badge className="border-white/10 bg-white/5 text-zinc-400">Effort: {na.effort}</Badge>
        <Badge className="border-white/10 bg-white/5 text-zinc-400">Impact: {na.impact}</Badge>
      </div>

      {na.unresolvedIssue && (
        <p className="rounded-xl bg-amber-500/5 px-3 py-2 text-sm text-amber-200/80">
          Open issue: {na.unresolvedIssue}
        </p>
      )}

      <div className="rounded-xl bg-black/20 p-3">
        <p className="text-[10px] uppercase text-zinc-600">Recommended prompt</p>
        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-zinc-400">
          {na.recommendedPrompt}
        </pre>
        <div className="mt-3 flex gap-2">
          <CopyButton text={na.recommendedPrompt} label="Copy prompt" compact />
        </div>
      </div>

      <QuickCommands
        project={project}
        commands={primary}
        onRun={() => setCopied(true)}
        compact
      />

      {copied && <p className="text-xs text-teal-500">Prompt copied — paste in Cursor</p>}
    </Card>
  );
}
