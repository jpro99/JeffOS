import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_LOCAL_MODEL, pickBestLocalModel } from "./localModels";

test("pickBestLocalModel prefers Jeff's installed qwen3.8", () => {
  const installed = ["qwen3.8:27b", "qwen3.5:9b", "qwen2.5:14b"];
  assert.equal(pickBestLocalModel(installed), "qwen3.8:27b");
  assert.equal(pickBestLocalModel(installed, "qwen3.5:9b"), "qwen3.5:9b");
});

test("pickBestLocalModel skips missing default and uses next installed", () => {
  const installed = ["qwen3.5:9b", "qwen2.5:14b"];
  assert.equal(pickBestLocalModel(installed), "qwen3.5:9b");
});

test("pickBestLocalModel falls back to DEFAULT when probe empty", () => {
  assert.equal(pickBestLocalModel([]), DEFAULT_LOCAL_MODEL);
});
