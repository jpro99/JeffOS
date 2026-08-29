import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildJeffAddReply, extractAcceptancePreview } from "@/lib/mission/jeff-reply";

describe("jeff-reply", () => {
  it("builds localhost reply with cursor open", () => {
    const text = buildJeffAddReply({
      summary: "remote desktop",
      stepCount: 5,
      prompt: "Goal (Phase 1): Professional remote desktop — one PC\n\nRepo: x",
      openedCursor: true,
      isLocalhost: true,
    });
    assert.match(text, /Got it — Professional remote desktop/);
    assert.match(text, /5-step/);
    assert.match(text, /Opened Cursor/);
  });

  it("warns Lemon users about local open", () => {
    const text = buildJeffAddReply({
      summary: "ui tweak",
      stepCount: 2,
      prompt: "Jeff wants: change button label\n",
      isLocalhost: false,
    });
    assert.match(text, /PC Bridge/);
    assert.match(text, /npm run bridge/);
  });

  it("extracts acceptance bullets", () => {
    const prompt = `Goal (Phase 1): x

Acceptance (Spec Bot confirms, then build):
- Host shows banner
- Guest Connect button
- File transfer works

Repo: C:\\x`;
    const bullets = extractAcceptancePreview(prompt);
    assert.equal(bullets.length, 3);
    assert.equal(bullets[0], "Host shows banner");
  });
});
