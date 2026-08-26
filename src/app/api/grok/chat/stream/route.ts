import {
  buildGrokSystemPrompt,
  type ChatMessage,
  type GrokBotContext,
  type GrokOps,
  type GrokProjectContext,
} from "@/lib/grok/engine";
import { spawnCloudAgent } from "@/lib/grok/spawnCloudAgent";
import { runTalkStream, type StreamEvent } from "@/lib/grok/streamEngine";
import { routeTalkMessage, stripLanePrefix, type TalkLane } from "@/lib/grok/taskRouter";

export const runtime = "nodejs";

function sseLine(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages?: ChatMessage[];
    bot?: GrokBotContext;
    project?: GrokProjectContext | null;
    stationed?: GrokProjectContext | null;
    ops?: Partial<GrokOps> & { preferLocal?: boolean; forceLane?: TalkLane | null };
    roster?: string[];
  };

  if (!body.bot?.id || !body.bot.name) {
    return new Response(JSON.stringify({ error: "Pick a bot." }), { status: 400 });
  }

  const rawMessages = body.messages ?? [];
  const lastUserRaw = [...rawMessages].reverse().find((m) => m.role === "user")?.content ?? "";
  const route = routeTalkMessage(lastUserRaw, {
    preferLocal: body.ops?.preferLocal !== false,
    forceLane: body.ops?.forceLane ?? null,
  });
  const messages = rawMessages.map((m) =>
    m.role === "user" ? { ...m, content: stripLanePrefix(m.content) } : m,
  );
  const lastUser = stripLanePrefix(lastUserRaw);

  const ops: GrokOps = {
    neverMerge: body.ops?.neverMerge !== false,
    neverGuess: body.ops?.neverGuess !== false,
    caveman: body.ops?.caveman !== false,
  };

  const system = buildGrokSystemPrompt({
    bot: body.bot,
    project: body.project ?? null,
    stationed: body.stationed ?? null,
    ops,
    roster: body.roster ?? [],
  });

  const workSystem =
    route.lane === "cloud-agent"
      ? `${system}

You are executing Jeff's request now inside Jeff OS Talk. Do NOT tell Jeff to paste anything into Cursor or open another app.
If code work is needed and a Cloud Agent was started, say what the agent is doing and link to it.
Answer in plain language with short steps you are taking. Stay in character as ${body.bot.name}.`
      : system;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const write = (event: StreamEvent) => {
        controller.enqueue(enc.encode(sseLine(event)));
      };

      try {
        write({ type: "status", text: route.reason });

        let agentUrl: string | undefined;
        let agentId: string | undefined;

        if (route.lane === "cloud-agent") {
          write({ type: "status", text: "Starting Cloud Agent on your repo…" });
          const spawn = await spawnCloudAgent({
            prompt: lastUser,
            botName: body.bot!.name,
            projectName: body.project?.name ?? body.stationed?.name ?? null,
            github: body.project?.github ?? body.stationed?.github ?? null,
            neverMerge: ops.neverMerge,
            neverGuess: ops.neverGuess,
          });

          if (spawn.ok) {
            agentId = spawn.agentId;
            agentUrl = spawn.agentUrl;
            write({
              type: "agent",
              agentId: spawn.agentId,
              agentUrl: spawn.agentUrl,
            });
            write({
              type: "status",
              text: "Agent is running — streaming status below…",
            });
          } else {
            write({
              type: "status",
              text: spawn.error?.includes("CURSOR_API_KEY")
                ? "No CURSOR_API_KEY — answering here and you can add the key in Settings later."
                : `Cloud Agent: ${spawn.error ?? "unavailable"} — answering here.`,
            });
          }
        }

        const result = await runTalkStream({
          messages,
          system: workSystem,
          lane: route.lane === "cloud-agent" ? "paid" : route.lane,
          preferLocal: body.ops?.preferLocal !== false && route.lane !== "cloud-agent",
          strictLane: route.forced,
          write,
        });

        let reply = result.reply;
        if (route.lane === "cloud-agent" && agentUrl) {
          reply = `${result.reply}\n\nCloud Agent started: ${agentUrl}`;
        }

        write({
          type: "done",
          reply,
          lane: route.lane === "cloud-agent" ? "cloud-agent" : result.lane,
          engine: result.engine,
          model: result.model,
        });
      } catch (err) {
        write({
          type: "error",
          message: err instanceof Error ? err.message : "Talk failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
