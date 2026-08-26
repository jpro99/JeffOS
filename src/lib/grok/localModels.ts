export type LocalRamTier = "8gb" | "16gb" | "32gb" | "64gb";

export type LocalModelPick = {
  id: string;
  ollama: string;
  ram: LocalRamTier;
  size: string;
  job: string;
};

/** Models Jeff downloads once onto the 24/7 home PC. Ollama tags, August 2026. */
export const LOCAL_MODEL_PICKS: LocalModelPick[] = [
  {
    id: "small-qa",
    ollama: "qwen2.5:7b",
    ram: "8gb",
    size: "4.7 GB",
    job: "Short questions, definitions, which-bot routing",
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

export const DEFAULT_LOCAL_MODEL = "qwen2.5:7b";

export const CLOUD_AGENTS_HOME = "https://cursor.com/agents";

export function modelsForRam(tier: LocalRamTier): LocalModelPick[] {
  const order: LocalRamTier[] = ["8gb", "16gb", "32gb", "64gb"];
  const max = order.indexOf(tier);
  return LOCAL_MODEL_PICKS.filter((m) => order.indexOf(m.ram) <= max);
}
