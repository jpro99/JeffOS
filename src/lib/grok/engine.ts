import { DEFAULT_LOCAL_MODEL, pickBestLocalModel } from "@/lib/grok/localModels";
import type { TalkLane } from "@/lib/grok/taskRouter";

export const XAI_API_BASE_URL = "https://api.x.ai/v1";
export const DEFAULT_GROK_MODEL = "grok-4.6";
export { DEFAULT_LOCAL_MODEL };

export type EngineKind = "local" | "grok" | "gemini";

export type ResolvedEngine = {
  engine: EngineKind;
  model: string;
  label: string;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type GrokOps = {
  neverMerge: boolean;
  neverGuess: boolean;
  caveman: boolean;
};

export type GrokBotContext = {
  id: string;
  name: string;
  role: string;
  description: string;
  promptPreview: string;
};

export type GrokProjectContext = {
  id: string;
  name: string;
  path?: string;
  github?: string | null;
};

export function ollamaHost(env: NodeJS.Dict<string | undefined> = process.env): string {
  return (env.OLLAMA_HOST || env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
}

export function ollamaModel(env: NodeJS.Dict<string | undefined> = process.env): string {
  return env.OLLAMA_MODEL?.trim() || DEFAULT_LOCAL_MODEL;
}

/** Local Ollama is the 24/7 home PC. Vercel cannot see localhost unless Jeff tunnels a host. */
export function localEngineConfigured(env: NodeJS.Dict<string | undefined> = process.env): boolean {
  if (env.OLLAMA_DISABLED === "1") return false;
  const explicit = (env.OLLAMA_HOST || env.OLLAMA_BASE_URL || "").trim();
  if (env.VERCEL && (!explicit || /localhost|127\.0\.0\.1/i.test(explicit))) {
    return false;
  }
  return true;
}

export function resolvePaidEngine(
  env: NodeJS.Dict<string | undefined> = process.env,
): ResolvedEngine | null {
  if (env.XAI_API_KEY?.trim()) {
    return {
      engine: "grok",
      model: env.XAI_MODEL?.trim() || DEFAULT_GROK_MODEL,
      label: "Grok (xAI)",
    };
  }
  if (env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim()) {
    return {
      engine: "gemini",
      model: "gemini-2.5-flash",
      label: "Gemini (fallback)",
    };
  }
  return null;
}

export function resolveLocalEngine(
  env: NodeJS.Dict<string | undefined> = process.env,
): ResolvedEngine | null {
  if (!localEngineConfigured(env)) return null;
  return {
    engine: "local",
    model: ollamaModel(env),
    label: `Home PC (${ollamaModel(env)})`,
  };
}

export function resolveEngine(env: NodeJS.Dict<string | undefined> = process.env): ResolvedEngine | null {
  return resolvePaidEngine(env);
}

export function pickEngineForLane(
  lane: TalkLane,
  env: NodeJS.Dict<string | undefined> = process.env,
): ResolvedEngine | null {
  if (lane === "local") return resolveLocalEngine(env) ?? resolvePaidEngine(env);
  return resolvePaidEngine(env) ?? resolveLocalEngine(env);
}

export function buildGrokSystemPrompt(opts: {
  bot: GrokBotContext;
  project: GrokProjectContext | null;
  stationed: GrokProjectContext | null;
  ops: GrokOps;
  roster: string[];
}): string {
  const isTower = opts.bot.id === "bot-control-tower" || /control tower/i.test(opts.bot.name);
  const stationLine = isTower
    ? opts.stationed
      ? `You are stationed on **${opts.stationed.name}**. Work that file unless Jeff sends you elsewhere.`
      : `You are Control Tower. Ask which project to sit on, or wait for Jeff to station you.`
    : `You are **${opts.bot.name}**${opts.project ? ` on **${opts.project.name}**` : ""}. Stay in your lane.`;

  const rules = [
    opts.ops.neverGuess
      ? "- Never guess facts, dollars, captions, coordinates, or legal claims. Say what you do not know."
      : "- Prefer verified facts; flag guesses.",
    opts.ops.neverMerge
      ? "- Never merge to main or enable auto-merge. Jeff approves every land."
      : "- Ask before merging.",
    opts.ops.caveman
      ? "- Voice: caveman — short, direct, no fluff."
      : "- Voice: clear and concise.",
    "- Jeff is in control. If he changes station, bot, or rules, follow immediately.",
    "- This is not legal advice.",
    "- You may use the Grok model. You are Jeff's private Control Tower, not xAI's consumer app.",
  ];

  const projectBits = [
    opts.project?.path ? `Path: ${opts.project.path}` : "",
    opts.project?.github ? `GitHub: ${opts.project.github}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `You are ${opts.bot.name} in Jeff OS — one Control Tower for every project.

${stationLine}

Role: ${opts.bot.role}
${opts.bot.description}
Bot packet: ${opts.bot.promptPreview}
${projectBits ? `\n${projectBits}\n` : ""}
Projects and bots:
${opts.roster.map((line) => `- ${line}`).join("\n")}

Rules:
${rules.join("\n")}`;
}

export function buildCloudAgentPacket(opts: {
  botName: string;
  projectName: string | null;
  github: string | null;
  lastUser: string;
}): string {
  const where = opts.github
    ? `Repo: ${opts.github}`
    : opts.projectName
      ? `Project: ${opts.projectName}`
      : "Project: (ask Jeff)";
  return `Start a Cloud Agent at https://cursor.com/agents
${where}
Bot: ${opts.botName}
Rules: never merge to main. Never guess. Jeff approves every land.

Jeff wants:
${opts.lastUser}

Work on a feature branch. Open a draft PR. Do not merge.`;
}

export async function probeOllama(
  env: NodeJS.Dict<string | undefined> = process.env,
): Promise<{ ok: boolean; models: string[] }> {
  if (!localEngineConfigured(env)) return { ok: false, models: [] };
  try {
    const res = await fetch(`${ollamaHost(env)}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return { ok: false, models: [] };
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    return {
      ok: true,
      models: (data.models ?? []).map((m) => m.name ?? "").filter(Boolean),
    };
  } catch {
    return { ok: false, models: [] };
  }
}

export function buildCursorPacket(opts: {
  botName: string;
  projectName: string | null;
  projectPath: string | null;
  lastUser: string;
  lastReply: string;
}): string {
  const where = opts.projectPath
    ? `Repo path: ${opts.projectPath}`
    : opts.projectName
      ? `Project: ${opts.projectName}`
      : "Project: (ask Jeff)";
  return `You are in Cursor on Jeff's machine.
${where}
Bot: ${opts.botName}
Mode: caveman. Minimal diff. Do not merge to main.

Jeff wants:
${opts.lastUser}

Grok already said:
${opts.lastReply}

Read README.md and AGENTS.md if they exist. Then do the work.`;
}

async function runOllamaChat(
  opts: { messages: ChatMessage[]; system: string },
  engine: ResolvedEngine,
): Promise<{ reply: string; engine: string; model: string }> {
  const res = await fetch(`${ollamaHost()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: engine.model,
      stream: false,
      think: false,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const data = (await res.json()) as {
    message?: { content?: string };
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Home PC model ${res.status}. Is Ollama running?`);
  }
  const reply = data.message?.content?.trim() ?? "";
  if (!reply) throw new Error("Home PC model returned an empty reply.");
  return { reply, engine: engine.label, model: engine.model };
}

export async function runGrokChat(opts: {
  messages: ChatMessage[];
  system: string;
  prefer?: TalkLane;
}): Promise<{ reply: string; engine: string; model: string; lane: TalkLane }> {
  const lane = opts.prefer === "local" ? "local" : "paid";
  let engine = pickEngineForLane(lane);
  if (lane === "local" && engine?.engine === "local") {
    const probe = await probeOllama();
    if (probe.ok) {
      const model = pickBestLocalModel(probe.models, ollamaModel());
      engine = { ...engine, model, label: `Home PC (${model})` };
    } else {
      engine = resolvePaidEngine();
    }
  }
  if (!engine) {
    throw new Error(
      "Start Ollama on the home PC, or add XAI_API_KEY (Grok) / GEMINI_API_KEY in .env.local / Vercel.",
    );
  }
  if (!opts.messages.some((m) => m.role === "user" && m.content.trim())) {
    throw new Error("Send a user message.");
  }

  const usedLane: TalkLane = engine.engine === "local" ? "local" : "paid";

  if (engine.engine === "local") {
    const local = await runOllamaChat(opts, engine);
    return { ...local, lane: usedLane };
  }

  if (engine.engine === "grok") {
    const res = await fetch(`${XAI_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: engine.model,
        temperature: 0.6,
        messages: [{ role: "system", content: opts.system }, ...opts.messages],
      }),
    });
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(data.error?.message || `Grok ${res.status}`);
    }
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) throw new Error("Grok returned an empty reply.");
    return { reply, engine: engine.label, model: engine.model, lane: usedLane };
  }

  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${engine.model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    },
  );
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini ${res.status}`);
  }
  const reply =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  if (!reply) throw new Error("Gemini returned an empty reply.");
  return { reply, engine: engine.label, model: engine.model, lane: usedLane };
}
