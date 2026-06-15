import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedState } from "@/lib/seed/data";
import { formatProjectBotsBlock, buildCompactFixPrompt } from "@/lib/mission/cursor-prompts";

describe("cursor-prompts — project bots block", () => {
  const project = seedState.projects.find((p) => p.id === "proj-jeff-os")!;
  const state = seedState;

  it("includes God Bot and fix-step workers from Settings", () => {
    const block = formatProjectBotsBlock(project, state, "projects/jeff-os.md");
    assert.match(block, /Jeff OS God Bot/);
    assert.match(block, /projects\/jeff-os\.md/);
    assert.match(block, /Step 1 Debug/);
    assert.match(block, /Step 2 Builder/);
    assert.match(block, /Step 3 Test/);
    assert.match(block, /Cursor/);
    assert.match(block, /code-heavy/);
    assert.doesNotMatch(block, /STEP 24/);
  });

  it("embeds bots block in compact fix prompt", () => {
    const prompt = buildCompactFixPrompt(project, state, {
      issueTitles: ["Example error"],
    });
    assert.match(prompt, /Bots \(from Jeff OS Settings/);
    assert.match(prompt, /# FIX ERRORS — Jeff OS/);
  });
});
