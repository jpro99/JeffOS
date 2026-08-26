import assert from "node:assert/strict";
import { test } from "node:test";
import { parseForcedLane, routeTalkMessage, stripLanePrefix } from "./taskRouter";

test("short research stays local", () => {
  const r = routeTalkMessage("What is a God Bot?");
  assert.equal(r.lane, "local");
  assert.equal(r.forced, false);
});

test("demand / money language goes paid", () => {
  const r = routeTalkMessage("Why did Damages keep the Enterprise $79.12 specials line?");
  assert.equal(r.lane, "paid");
});

test("implement / PR language goes to a Cloud Agent", () => {
  const r = routeTalkMessage("Implement the GIS owner-field fix and open a PR.");
  assert.equal(r.lane, "cloud-agent");
});

test("Jeff can force a lane with a slash", () => {
  assert.equal(parseForcedLane("/local what is CACI 1001"), "local");
  assert.equal(parseForcedLane("/grok research this owner"), "paid");
  assert.equal(parseForcedLane("/cloud add a test for the router"), "cloud-agent");
  assert.equal(stripLanePrefix("/local what is CACI 1001"), "what is CACI 1001");
});

test("forced lane wins over heuristics", () => {
  const r = routeTalkMessage("Implement the GIS owner-field fix and open a PR.", {
    forceLane: "local",
  });
  assert.equal(r.lane, "local");
  assert.equal(r.forced, true);
});
