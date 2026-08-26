import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCloudAgentPacket,
  buildCursorPacket,
  buildGrokSystemPrompt,
  localEngineConfigured,
  pickEngineForLane,
  resolveEngine,
  resolveLocalEngine,
} from "./engine";

test("resolveEngine prefers Grok when XAI_API_KEY is set", () => {
  const e = resolveEngine({ XAI_API_KEY: "x", GEMINI_API_KEY: "g" });
  assert.equal(e?.engine, "grok");
  assert.equal(e?.model, "grok-4.6");
});

test("resolveEngine falls back to Gemini", () => {
  const e = resolveEngine({ GEMINI_API_KEY: "g" });
  assert.equal(e?.engine, "gemini");
});

test("resolveEngine is null without keys", () => {
  assert.equal(resolveEngine({}), null);
});

test("local engine is on for a home PC and off on Vercel localhost", () => {
  assert.equal(localEngineConfigured({}), true);
  assert.equal(localEngineConfigured({ VERCEL: "1" }), false);
  assert.equal(localEngineConfigured({ VERCEL: "1", OLLAMA_HOST: "https://jeff-pc.ts.net" }), true);
  assert.equal(resolveLocalEngine({})?.engine, "local");
  assert.equal(resolveLocalEngine({})?.model, "qwen2.5:7b");
});

test("local lane falls back to Grok when Ollama is disabled", () => {
  const e = pickEngineForLane("local", { OLLAMA_DISABLED: "1", XAI_API_KEY: "x" });
  assert.equal(e?.engine, "grok");
});

test("Cloud Agent packet tells Jeff not to merge", () => {
  const packet = buildCloudAgentPacket({
    botName: "Builder Bot",
    projectName: "Demand Generator Pro",
    github: "https://github.com/jpro99/Demand-Generator-Pro",
    lastUser: "Fix the GIS owner field.",
  });
  assert.match(packet, /cursor.com\/agents/);
  assert.match(packet, /Do not merge/);
  assert.match(packet, /Fix the GIS owner field/);
});

test("Control Tower prompt stations on a project and honors never-merge", () => {
  const prompt = buildGrokSystemPrompt({
    bot: {
      id: "bot-control-tower",
      name: "Control Tower",
      role: "Portfolio orchestrator",
      description: "Routes work.",
      promptPreview: "Read CONTROL_TOWER.md",
    },
    project: null,
    stationed: { id: "proj-demand-generator", name: "Demand Generator Pro" },
    ops: { neverMerge: true, neverGuess: true, caveman: true },
    roster: ["Demand Generator Pro: Neuro, Damages"],
  });
  assert.match(prompt, /stationed on \*\*Demand Generator Pro\*\*/);
  assert.match(prompt, /Never merge to main/);
  assert.match(prompt, /Never guess/);
  assert.match(prompt, /caveman/);
});

test("project bot stays in its lane", () => {
  const prompt = buildGrokSystemPrompt({
    bot: {
      id: "bot-neuro",
      name: "Neuro",
      role: "Never guess",
      description: "Truth from exhibits.",
      promptPreview: "Never ghost.",
    },
    project: { id: "proj-demand-generator", name: "Demand Generator Pro", path: "C:\\vercel generator" },
    stationed: null,
    ops: { neverMerge: true, neverGuess: true, caveman: false },
    roster: [],
  });
  assert.match(prompt, /You are \*\*Neuro\*\* on \*\*Demand Generator Pro\*\*/);
  assert.match(prompt, /C:\\vercel generator/);
});

test("Cursor packet is paste-ready", () => {
  const packet = buildCursorPacket({
    botName: "Neuro",
    projectName: "Demand Generator Pro",
    projectPath: "C:\\vercel generator",
    lastUser: "Fix the GIS owner field.",
    lastReply: "Do not invent PRIMARY_OWNER.",
  });
  assert.match(packet, /C:\\vercel generator/);
  assert.match(packet, /Fix the GIS owner field/);
  assert.match(packet, /Do not merge to main/);
});
