import assert from "node:assert/strict";
import { test } from "node:test";
import { cloudAgentConfigured } from "./spawnCloudAgent";

test("cloud agent auto-start is off without CURSOR_API_KEY", () => {
  assert.equal(cloudAgentConfigured({}), false);
  assert.equal(cloudAgentConfigured({ CURSOR_API_KEY: "crsr_test" }), true);
  assert.equal(cloudAgentConfigured({ CURSOR_API_TOKEN: "crsr_test" }), true);
});
