import {
  ollamaHost,
  pickEngineForLane,
  probeOllama,
  resolvePaidEngine,
  type ChatMessage,
  type ResolvedEngine,
} from "@/lib/grok/engine";
import { localAnswerLooksUsable } from "@/lib/grok/localAnswerOk";
import type { TalkLane } from "@/lib/grok/taskRouter";

export type StreamEvent =
  | { type: "status"; text: string }
  | { type: "token"; text: string }
  | { type: "lane"; lane: TalkLane; engine: string; model: string }
  | { type: "agent"; agentId?: string; agentUrl?: string }
  | { type: "done"; reply: string; lane: TalkLane; engine: string; model: string }
  | { type: "error"; message: string };

export type StreamWriter = (event: StreamEvent) => void;

async function consumeOpenAiSse(
  body: ReadableStream<Uint8Array>,
  onToken: (t: string) => void,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const piece = json.choices?.[0]?.delta?.content ?? "";
        if (piece) {
          full += piece;
          onToken(piece);
        }
      } catch {
        /* skip malformed chunk */
      }
    }
  }

  return full.trim();
}

async function streamOllama(
  engine: ResolvedEngine,
  messages: ChatMessage[],
  system: string,
  write: StreamWriter,
): Promise<{ reply: string; lane: TalkLane }> {
  write({ type: "status", text: `Connecting to home PC (${engine.model})…` });
  const res = await fetch(`${ollamaHost()}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: engine.model,
      temperature: 0.4,
      stream: true,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message || `Home PC model ${res.status}`);
  }

  write({ type: "status", text: "Writing answer…" });
  const reply = await consumeOpenAiSse(res.body, (t) => write({ type: "token", text: t }));
  if (!reply) throw new Error("Home PC model returned an empty reply.");
  return { reply, lane: "local" };
}

async function streamGrok(
  engine: ResolvedEngine,
  messages: ChatMessage[],
  system: string,
  write: StreamWriter,
): Promise<{ reply: string; lane: TalkLane }> {
  write({ type: "status", text: "Thinking…" });
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: engine.model,
      temperature: 0.6,
      stream: true,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message || `Grok ${res.status}`);
  }

  const reply = await consumeOpenAiSse(res.body, (t) => write({ type: "token", text: t }));
  if (!reply) throw new Error("Grok returned an empty reply.");
  return { reply, lane: "paid" };
}

async function streamGemini(
  engine: ResolvedEngine,
  messages: ChatMessage[],
  system: string,
  write: StreamWriter,
): Promise<{ reply: string; lane: TalkLane }> {
  write({ type: "status", text: "Thinking…" });
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${engine.model}:streamGenerateContent?alt=sse&key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    },
  );

  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message || `Gemini ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      try {
        const json = JSON.parse(payload) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const piece = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        if (piece) {
          full += piece;
          write({ type: "token", text: piece });
        }
      } catch {
        /* skip */
      }
    }
  }

  if (!full.trim()) throw new Error("Gemini returned an empty reply.");
  return { reply: full.trim(), lane: "paid" };
}

async function streamWithEngine(
  engine: ResolvedEngine,
  messages: ChatMessage[],
  system: string,
  write: StreamWriter,
): Promise<{ reply: string; lane: TalkLane; engine: ResolvedEngine }> {
  write({
    type: "lane",
    lane: engine.engine === "local" ? "local" : "paid",
    engine: engine.label,
    model: engine.model,
  });

  if (engine.engine === "local") {
    const out = await streamOllama(engine, messages, system, write);
    return { ...out, engine };
  }
  if (engine.engine === "grok") {
    const out = await streamGrok(engine, messages, system, write);
    return { ...out, engine };
  }
  const out = await streamGemini(engine, messages, system, write);
  return { ...out, engine };
}

export async function runTalkStream(opts: {
  messages: ChatMessage[];
  system: string;
  lane: TalkLane;
  preferLocal?: boolean;
  write: StreamWriter;
}): Promise<{ reply: string; lane: TalkLane; engine: string; model: string }> {
  const write = opts.write;

  if (!opts.messages.some((m) => m.role === "user" && m.content.trim())) {
    throw new Error("Send a user message.");
  }

  write({ type: "status", text: "Reading your message…" });

  const tryLocalFirst =
    opts.lane === "local" || (opts.lane === "paid" && opts.preferLocal !== false);

  if (tryLocalFirst) {
    const engine = pickEngineForLane("local");
    if (engine?.engine === "local") {
      const probe = await probeOllama();
      if (probe.ok) {
        try {
          const result = await streamWithEngine(engine, opts.messages, opts.system, write);
          if (opts.lane === "local" || localAnswerLooksUsable(result.reply)) {
            return {
              reply: result.reply,
              lane: result.lane,
              engine: result.engine.label,
              model: result.engine.model,
            };
          }
          write({ type: "status", text: "Switching to paid engine for a better answer…" });
        } catch (err) {
          write({
            type: "status",
            text: err instanceof Error ? err.message : "Home PC unavailable",
          });
        }
      } else if (opts.lane === "local") {
        write({ type: "status", text: "Home PC is off — trying paid engine…" });
      }
    }
  }

  const paid = resolvePaidEngine() ?? pickEngineForLane("paid");
  if (!paid) {
    throw new Error(
      "No engine available. Start Ollama on the home PC or add XAI_API_KEY / GEMINI_API_KEY.",
    );
  }

  const result = await streamWithEngine(paid, opts.messages, opts.system, write);
  return {
    reply: result.reply,
    lane: result.lane,
    engine: result.engine.label,
    model: result.engine.model,
  };
}
