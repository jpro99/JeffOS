import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ackBridgeJob, enqueueBridgeJob, pollBridgeJob } from "@/lib/bridge/job-store";

describe("bridge job-store", () => {
  it("enqueues and polls by token", () => {
    const token = `test-token-${Date.now()}`;
    const job = enqueueBridgeJob({
      token,
      folderPath: "C:\\Projects\\All In One Edgar",
      prompt: "# ADD",
    });
    assert.ok(job.id);
    const polled = pollBridgeJob(token);
    assert.ok(polled);
    assert.equal(polled?.folderPath, "C:\\Projects\\All In One Edgar");
    assert.equal(ackBridgeJob(token, job.id), true);
    assert.equal(pollBridgeJob(token), null);
  });

  it("ignores wrong token", () => {
    const token = `tok-a-${Date.now()}`;
    enqueueBridgeJob({ token, folderPath: "C:\\Projects\\x" });
    assert.equal(pollBridgeJob("wrong-token-zzzz"), null);
  });
});
