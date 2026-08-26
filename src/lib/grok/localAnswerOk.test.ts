import assert from "node:assert/strict";
import { test } from "node:test";
import { localAnswerLooksUsable } from "./localAnswerOk";

test("Jeff's exact bad God Bot dump is not usable", () => {
  const bad =
    'A "God Bot" is a colloquial term used to describe an artificial intelligence system endowed with near-omnipotent authority, omniscient knowledge, or supreme autonomy within its specific digital environment or game ecosystem.';
  assert.equal(localAnswerLooksUsable(bad), false);
});

test("Jeff OS refusal is not usable", () => {
  const bad =
    'I cannot confirm that statement as true because "Jeff OS" and the specific role of a "God Bot" are fictional concepts that do not correspond to any real operating system.';
  assert.equal(localAnswerLooksUsable(bad), false);
});

test("rewrite of a supplied fact is usable", () => {
  assert.equal(localAnswerLooksUsable("A God Bot is the owner bot for a single project."), true);
});

test("empty or thinking dump is not usable", () => {
  assert.equal(localAnswerLooksUsable(""), false);
  assert.equal(localAnswerLooksUsable("Thinking...\nlong notes"), false);
});
