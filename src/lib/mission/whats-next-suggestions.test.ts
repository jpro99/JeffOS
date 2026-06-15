import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedState } from "@/lib/seed/data";
import { attachOrchestration } from "@/lib/orchestration/defaults";
import { buildWhatsNextSuggestions } from "@/lib/mission/whats-next-suggestions";
import { applyBotsToProject, botsLineupMatchesSuggestion } from "@/lib/mission/suggest-project-bots";

describe("whats-next-suggestions", () => {
  it("includes God Mode ideas when present on project", () => {
    const project = seedState.projects.find((p) => p.id === "proj-jeff-os")!;
    const list = buildWhatsNextSuggestions(project, null, { openProblemCount: 0 });
    assert.ok(list.some((s) => s.source === "god-mode"));
    assert.ok(list.some((s) => s.buildIntent.length > 10));
  });

  it("puts fix-first prompt when problems are open", () => {
    const project = seedState.projects.find((p) => p.id === "proj-jeff-os")!;
    const list = buildWhatsNextSuggestions(project, null, { openProblemCount: 2 });
    assert.equal(list[0]?.title, "Clear open problems first");
  });
});

describe("applyBotsToProject — one tap", () => {
  it("preserves project path and ops while applying full lineup", () => {
    const project = attachOrchestration(seedState.projects.find((p) => p.id === "proj-jeff-os")!);
    const path = project.path;
    const ops = project.ops;
    const next = applyBotsToProject(project, seedState.bots, "god");
    assert.equal(next.path, path);
    assert.equal(next.ops, ops);
    assert.ok(next.workerBotIds.length >= 3);
    assert.ok(botsLineupMatchesSuggestion(next, seedState.bots, "god"));
  });
});
