/** Short in-app Jeff reply after Go — GrokBot-style chat feel without an LLM call. */
export function buildJeffAddReply(opts: {
  summary: string;
  stepCount: number;
  prompt: string;
  hasDesign?: boolean;
  openedCursor?: boolean;
  cursorNote?: string;
  isLocalhost?: boolean;
}): string {
  const lines: string[] = [];
  const goal =
    opts.prompt.match(/Goal \(Phase 1\):\s*(.+)/)?.[1]?.trim() ||
    opts.prompt.match(/Jeff wants:\s*(.+)/)?.[1]?.trim() ||
    opts.summary;

  lines.push(`Got it — ${goal.slice(0, 220)}${goal.length > 220 ? "…" : ""}`);
  lines.push(`Built a ${opts.stepCount}-step Cursor prompt (${opts.summary}).`);

  if (opts.hasDesign) {
    lines.push("Design photo colors are in the prompt — also drag that image into Cursor.");
  }

  if (opts.openedCursor) {
    lines.push(
      opts.cursorNote ??
        "Opened Cursor on your project folder. Prompt is on the clipboard — paste in Agent chat (Ctrl+V).",
    );
  } else if (opts.isLocalhost === false) {
    lines.push(
      "You're on Lemon. Set PC Bridge in Easy Settings (npm run bridge on your PC) so Go opens Cursor — or paste the prompt manually.",
    );
  } else {
    lines.push("Prompt ready on clipboard. Paste in Cursor Agent — then Check again here when done.");
  }

  return lines.join("\n\n");
}

export function extractAcceptancePreview(prompt: string, max = 3): string[] {
  const lines = prompt.split("\n");
  const start = lines.findIndex((l) => /^Acceptance/i.test(l.trim()));
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length && out.length < max; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("-")) break;
    out.push(line.replace(/^-\s*/, ""));
  }
  return out;
}
