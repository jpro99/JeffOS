import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractPaletteFromRgba,
  formatDesignReferenceBlock,
  type DesignReference,
} from "@/lib/mission/design-from-image";

describe("design-from-image", () => {
  it("extracts dominant dark background palette", () => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 24;
      data[i + 1] = 24;
      data[i + 2] = 27;
      data[i + 3] = 255;
    }
    data[0] = 139;
    data[1] = 92;
    data[2] = 246;
    const out = extractPaletteFromRgba(data);
    assert.ok(out.isDark);
    assert.ok(out.palette.length >= 1);
  });

  it("formats design block for Cursor prompt", () => {
    const ref: DesignReference = {
      fileName: "mock.png",
      width: 800,
      height: 600,
      isDark: true,
      backgroundHex: "#18181b",
      textHex: "#f4f4f5",
      accentHex: "#8b5cf6",
      palette: ["#18181b", "#8b5cf6"],
      summary: "Dark UI",
    };
    const block = formatDesignReferenceBlock(ref);
    assert.match(block, /Design reference/);
    assert.match(block, /attach the same screenshot/);
    assert.match(block, /#8b5cf6/);
  });
});
