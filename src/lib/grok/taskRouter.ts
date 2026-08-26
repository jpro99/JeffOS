export type TalkLane = "local" | "paid" | "cloud-agent";

export type TalkRoute = {
  lane: TalkLane;
  reason: string;
  forced: boolean;
};

const LOCAL_HINT =
  /\b(what is|what's|whats|who is|define|meaning of|explain briefly|quick question|translate|how do you say|typo|spelling|which bot|which project)\b/i;

const PAID_HINT =
  /\b(demand|exhibit|damages|specials|medical bill|never guess|never ghost|sol\b|statute|liability|caci|gis|owner field|research|compare|analyze|why did|root cause|playbook)\b/i;

const CLOUD_HINT =
  /\b(implement|write code|edit the|fix the bug|open a pr|pull request|commit|refactor|ship this|migrate|typescript|multi-file|cloud agent|cursor agent|build the|patch|add a route|add a test)\b/i;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function parseForcedLane(text: string): TalkLane | null {
  const t = text.trim();
  if (/^\/(local|home|ollama)\b/i.test(t)) return "local";
  if (/^\/(grok|paid|gemini)\b/i.test(t)) return "paid";
  if (/^\/(cloud|agent|cursor)\b/i.test(t)) return "cloud-agent";
  if (/\buse (the )?local\b/i.test(t) && wordCount(t) < 24) return "local";
  if (/\buse (grok|paid)\b/i.test(t) && wordCount(t) < 24) return "paid";
  if (/\buse (a )?cloud agent\b/i.test(t)) return "cloud-agent";
  return null;
}

/** Strip /local /grok /cloud prefixes so the model does not see the switch command. */
export function stripLanePrefix(text: string): string {
  return text.replace(/^\/(local|home|ollama|grok|paid|gemini|cloud|agent|cursor)\s+/i, "").trim();
}

/**
 * Pick the cheapest lane that can honestly handle the message.
 * Small research stays on the home PC. Money/legal/detail goes paid.
 * Real code edits go to a Cloud Agent / Cursor packet — not chat.
 */
export function routeTalkMessage(
  text: string,
  opts?: { preferLocal?: boolean; forceLane?: TalkLane | null },
): TalkRoute {
  const forced = opts?.forceLane ?? parseForcedLane(text);
  if (forced) {
    return { lane: forced, reason: "Jeff picked this lane.", forced: true };
  }

  const words = wordCount(text);
  if (CLOUD_HINT.test(text) || words > 220) {
    return {
      lane: "cloud-agent",
      reason: "This is code or a long build. Cloud Agents write it on a remote machine.",
      forced: false,
    };
  }

  if (PAID_HINT.test(text) || words > 80) {
    return {
      lane: "paid",
      reason: "Needs more detail than the home model — using the paid engine.",
      forced: false,
    };
  }

  if (opts?.preferLocal !== false && (LOCAL_HINT.test(text) || words <= 40)) {
    return {
      lane: "local",
      reason: "Short question — home PC model if it is running.",
      forced: false,
    };
  }

  return {
    lane: "paid",
    reason: "Default to the paid engine when the home model is not a clear fit.",
    forced: false,
  };
}
