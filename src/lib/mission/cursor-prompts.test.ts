import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedState } from "@/lib/seed/data";
import { PROJECT_OPS } from "@/lib/seed/project-ops";
import {
  formatProjectBotsBlock,
  buildCompactFixPrompt,
  buildCompactAddPrompt,
  cleanAddIntent,
  formatIntentBrief,
} from "@/lib/mission/cursor-prompts";

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

describe("cursor-prompts — add to project", () => {
  const state = seedState;
  const jeffOs = seedState.projects.find((p) => p.id === "proj-jeff-os")!;

  const edgar = {
    id: "proj-edgar",
    name: "All In One Edgar",
    slug: "all-in-one-edgar",
    path: "C:\\Projects\\All In One Edgar",
    type: "Infra / .NET",
    stack: [".NET", "Docker", "NAS deploy", "Entra auth"],
    status: "active" as const,
    priority: "P2" as const,
    description: "Sign-in web app + PC agents.",
    goals: ["NAS deploy stability"],
    risks: [],
    roadmap: [],
    assignedGodBotId: "bot-god-edgar",
    workerBotIds: ["bot-deploy", "bot-security"],
    preferredInterface: "regular-claude" as const,
    preferredModelClass: "planning-heavy" as const,
    activeBotStrategy: "God Bot + Deploy Worker",
    lastUpdated: new Date().toISOString(),
    ops: PROJECT_OPS["proj-edgar"],
  };

  it("cleans duplicate Jeff wants prefix", () => {
    const cleaned = cleanAddIntent("Jeff wants: Jeff wants: add a connect button");
    assert.equal(cleaned, "add a connect button");
  });

  it("bullets long voice ramble in header", () => {
    const long =
      "Build remote desktop for Edgar. Users invite someone and click Connect. Show a banner on screen. Compare RustDesk first. Push updates to all 8 PCs in the office. Auto install agents with PowerShell admin. Bypass UAC if needed.";
    const brief = formatIntentBrief(cleanAddIntent(long));
    assert.match(brief, /^- /m);
  });

  it("includes Settings bots block in add prompt", () => {
    const { prompt } = buildCompactAddPrompt(jeffOs, "Add export button to settings", state);
    assert.match(prompt, /Bots \(Jeff OS Settings/);
    assert.match(prompt, /Jeff OS God Bot/);
    assert.match(prompt, /# ADD TO PROJECT — Jeff OS/);
    assert.doesNotMatch(prompt, /Jeff wants: Jeff wants:/);
  });

  it("uses dotnet verify for Edgar stack", () => {
    const intent =
      "Remote desktop spike — one PC invite connect banner. Fleet push later.";
    const { prompt, stepCount } = buildCompactAddPrompt(edgar, intent, state);
    assert.match(prompt, /Verify: dotnet build/);
    assert.match(prompt, /START-HERE-EDGAR\.md/);
    assert.match(prompt, /Edgar God Bot/);
    assert.match(prompt, /Phase 1 ONLY/);
    assert.match(prompt, /Security \/ Risk Bot/);
    assert.match(prompt, /no UAC\/AV bypass/);
    assert.ok(stepCount >= 4);
  });

  it("small UI ask uses Builder + Test only", () => {
    const { prompt, stepCount } = buildCompactAddPrompt(
      jeffOs,
      "Change the purple Go button label to say Copy prompt",
      state,
    );
    assert.match(prompt, /Builder Bot/);
    assert.match(prompt, /Test Bot/);
    assert.doesNotMatch(prompt, /Phase 1 ONLY/);
    assert.equal(stepCount, 2);
  });
});
