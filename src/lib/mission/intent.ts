import { createFeature } from "@/lib/orchestration/defaults";
import type { ProjectFeature } from "@/lib/types";

/** Long visionary briefs — not comma-split prose */
export function isVisionIntent(intent: string): boolean {
  const t = intent.trim();
  const visionKeywords =
    /\b(mainstream jeff os|transform the product|best version of|give to anybody|god mode for everyone|whole world|programming into|leap forward|revolution|anybody else|command center for everybody|platform for everyone)\b/i;
  if (visionKeywords.test(t)) return true;
  if (t.length > 420 && /\b(vision|platform|everyone|anybody|mainstream)\b/i.test(t)) return true;
  return false;
}

/** Single UI/UX tweak — never fan out to 4 vision features */
export function isSingleTaskIntent(intent: string): boolean {
  const t = intent.trim();
  if (t.length > 320) return false;
  return /\b(button|click|fix errors|copy|paste|panel|label|text|show|hide|display|ui|ux|screen|wording|sticky|scroll|tooltip|message)\b/i.test(
    t,
  );
}

function titleFromChunk(chunk: string, max = 48): string {
  const cleaned = chunk.replace(/^fix\s+/i, "Fix: ").trim();
  if (cleaned.length <= max) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  const cut = cleaned.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Vision → 4 concrete product features (not random comma chunks) */
function visionFeaturesFromIntent(intent: string): ProjectFeature[] {
  const note = intent.trim().slice(0, 400);
  return [
    createFeature({
      name: "Mainstream welcome",
      description: `First-run feels like installing an app — welcome, pick folder, 3 steps. Jeff vision: ${note}`,
      priority: "P0",
      type: "core",
      status: "not-built",
    }),
    createFeature({
      name: "Import any project",
      description: "Scan a folder on disk, find repos, one-click import. Anyone can bring their work.",
      priority: "P0",
      type: "core",
      status: "not-built",
    }),
    createFeature({
      name: "Mac + Windows polish",
      description: "Mix Apple calm (spacing, clarity) with Windows directness (big actions, obvious paths).",
      priority: "P0",
      type: "core",
      status: "not-built",
    }),
    createFeature({
      name: "God Mode for everyone",
      description: "One tap — full God Mode strategy prompt. Mainstream users get breakthrough mode too.",
      priority: "P1",
      type: "core",
      status: "not-built",
    }),
  ];
}

/** Turn plain English into 1–5 features (rule-based, no AI). */
export function featuresFromIntent(intent: string): ProjectFeature[] {
  const trimmed = intent.trim();
  if (!trimmed) return [];

  if (isSingleTaskIntent(trimmed)) {
    return [
      createFeature({
        name: titleFromChunk(trimmed),
        description: trimmed,
        type: "core",
        priority: "P0",
        status: "not-built",
      }),
    ];
  }

  if (isVisionIntent(trimmed)) {
    return visionFeaturesFromIntent(trimmed);
  }

  const parts = trimmed
    .split(/\n+|(?:^|\s)[-•*]\s+|\d+[.)]\s+|(?:\s+and\s+I\s+need\s+)|(?:\s+also\s+)/i)
    .map((p) => p.trim().replace(/^[-•*]\s*/, ""))
    .filter((p) => p.length > 3);

  let chunks = parts.length > 0 ? parts.slice(0, 5) : [trimmed];

  if (chunks.length === 1 && chunks[0].length > 90) {
    chunks = [trimmed];
  }

  if (chunks.length > 1 && trimmed.length > 120) {
    const commaParts = trimmed.split(/,\s+(?=[A-Za-z"'])/).filter((p) => p.trim().length > 8);
    if (commaParts.length > chunks.length && commaParts.length <= 5) {
      const avgLen = commaParts.reduce((a, p) => a + p.length, 0) / commaParts.length;
      if (avgLen > 40) chunks = [trimmed];
    }
  }

  return chunks.map((chunk) => {
    const isFix = /\b(fix|bug|crash|error|broken|repair|patch)\b/i.test(chunk);
    const isAdd = /\b(add|build|create|ship|implement|new)\b/i.test(chunk);

    return createFeature({
      name: titleFromChunk(chunk),
      description: chunk,
      type: "core",
      priority: isFix ? "P0" : isAdd ? "P1" : "P2",
      status: "not-built",
    });
  });
}

export function summarizeIntent(intent: string): string {
  if (isVisionIntent(intent)) {
    return "Mainstream Jeff OS — welcome, import, polish, God Mode for everyone";
  }
  const features = featuresFromIntent(intent);
  if (features.length === 1) return features[0].name;
  return `${features.length} features: ${features.map((f) => f.name).join(", ")}`;
}
