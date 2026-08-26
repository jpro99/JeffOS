export type LocalRamTier = "8gb" | "16gb" | "32gb" | "64gb";

export type LocalModelPick = {
  id: string;
  ollama: string;
  ram: LocalRamTier;
  size: string;
  job: string;
};

/** Installed on Jeff's Velocity Micro (VM-902385), Aug 2026 — try in this order. */
export const JEFF_HOME_MODEL_ORDER = ["qwen3.8:27b", "qwen3.5:9b", "qwen2.5:14b"] as const;

/** Models Jeff downloads once onto the 24/7 home PC. Ollama tags, August 2026. */
export const LOCAL_MODEL_PICKS: LocalModelPick[] = [
  {
    id: "home-main",
    ollama: "qwen3.8:27b",
    ram: "32gb",
    size: "17 GB",
    job: "Main home brain — short Qs and rewrites (--think=false)",
  },
  {
    id: "home-fast",
    ollama: "qwen3.5:9b",
    ram: "16gb",
    size: "6 GB",
    job: "Fast rewrites on the 24/7 box",
  },
  {
    id: "home-spare",
    ollama: "qwen2.5:14b",
    ram: "16gb",
    size: "9 GB",
    job: "Spare local model",
  },
  {
    id: "small-qa",
    ollama: "qwen2.5:7b",
    ram: "8gb",
    size: "4.7 GB",
    job: "Short questions on a smaller box (not on Jeff's VM)",
  },
  {
    id: "small-code",
    ollama: "qwen2.5-coder:7b",
    ram: "8gb",
    size: "4.7 GB",
    job: "Tiny code lookups on a laptop-class box",
  },
  {
    id: "mid-reason",
    ollama: "gpt-oss:20b",
    ram: "16gb",
    size: "14 GB",
    job: "Longer research and tool-style answers on 16 GB",
  },
  {
    id: "mid-vision",
    ollama: "gemma4:12b",
    ram: "16gb",
    size: "~8 GB",
    job: "Photos / documents when the home PC has a GPU",
  },
  {
    id: "best-code",
    ollama: "qwen3.6:27b",
    ram: "32gb",
    size: "17 GB",
    job: "Best local coding model for a 32 GB always-on box",
  },
  {
    id: "agent-code",
    ollama: "devstral-small-2:24b",
    ram: "32gb",
    size: "15 GB",
    job: "Multi-file local coding if Qwen 3.6 is too heavy",
  },
];

export const DEFAULT_LOCAL_MODEL = "qwen3.8:27b";

export const CLOUD_AGENTS_HOME = "https://cursor.com/agents";

function installedMatch(installed: string[], want: string): string | null {
  const base = want.split(":")[0];
  for (const tag of installed) {
    const t = tag.trim();
    if (!t) continue;
    if (t === want || t.startsWith(`${base}:`)) return t;
  }
  return null;
}

/** Pick an Ollama tag that is actually installed; prefer env then Jeff's home order. */
export function pickBestLocalModel(
  installed: string[],
  preferred?: string | null,
): string {
  const pref = preferred?.trim();
  if (pref) {
    const hit = installedMatch(installed, pref);
    if (hit) return hit;
  }
  for (const candidate of JEFF_HOME_MODEL_ORDER) {
    const hit = installedMatch(installed, candidate);
    if (hit) return hit;
  }
  for (const pick of LOCAL_MODEL_PICKS) {
    const hit = installedMatch(installed, pick.ollama);
    if (hit) return hit;
  }
  if (installed.length > 0) return installed[0]!.trim();
  return pref || DEFAULT_LOCAL_MODEL;
}

export function modelsForRam(tier: LocalRamTier): LocalModelPick[] {
  const order: LocalRamTier[] = ["8gb", "16gb", "32gb", "64gb"];
  const max = order.indexOf(tier);
  return LOCAL_MODEL_PICKS.filter((m) => order.indexOf(m.ram) <= max);
}
