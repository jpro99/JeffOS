import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyCostModeToProfile,
  applyProjectPlaybook,
  getProjectPlaybook,
} from "@/lib/mission/add-prompt-playbooks";
import type { AddIntentProfile } from "@/lib/mission/add-prompt-playbooks";
import { seedState } from "@/lib/seed/data";

describe("add-prompt-playbooks", () => {
  const baseProfile: AddIntentProfile = {
    domain: "remote-desktop",
    phase1Goal: "Test goal",
    phase2Later: null,
    acceptance: ["One"],
    architectTask: "Architect base",
    specTask: "Spec",
    builderHint: "Build",
    outOfScope: [],
  };

  const edgar = {
    id: "proj-edgar",
    slug: "all-in-one-edgar",
    name: "All In One Edgar",
    stack: [".NET"],
    ops: { godModeIdeas: [] },
  } as (typeof seedState.projects)[0];

  it("loads Edgar playbook with verify override", () => {
    const pb = getProjectPlaybook(edgar);
    assert.ok(pb);
    assert.equal(pb?.verifyOverride, "dotnet build AllInOneEdgar.sln");
    assert.ok(pb?.bootNotes.some((n) => n.includes("Run-Edgar-Dev")));
  });

  it("merges playbook acceptance extras on big adds", () => {
    const merged = applyProjectPlaybook(baseProfile, edgar, true);
    assert.ok(merged.acceptance.some((a) => a.includes("Entra")));
    assert.match(merged.architectTask, /AllInOneEdgar\.sln/);
  });

  it("cost save mode adds reuse-OSS architect hint", () => {
    const state = { ...seedState, settings: { ...seedState.settings, costSaveMode: true } };
    const merged = applyCostModeToProfile(baseProfile, state, "standard");
    assert.match(merged.architectTask, /reuse OSS/i);
  });
});
