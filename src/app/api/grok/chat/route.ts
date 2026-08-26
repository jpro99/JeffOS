import { NextResponse } from "next/server";
import {
  buildGrokSystemPrompt,
  runGrokChat,
  type ChatMessage,
  type GrokBotContext,
  type GrokOps,
  type GrokProjectContext,
} from "@/lib/grok/engine";
import { spawnCloudAgent } from "@/lib/grok/spawnCloudAgent";
import { CLOUD_AGENTS_HOME } from "@/lib/grok/localModels";
import { routeTalkMessage, stripLanePrefix, type TalkLane } from "@/lib/grok/taskRouter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: ChatMessage[];
      bot?: GrokBotContext;
      project?: GrokProjectContext | null;
      stationed?: GrokProjectContext | null;
      ops?: Partial<GrokOps> & { preferLocal?: boolean; forceLane?: TalkLane | null };
      roster?: string[];
    };
    if (!body.bot?.id || !body.bot.name) {
      return NextResponse.json({ error: "Pick a bot." }, { status: 400 });
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

    let agentUrl: string | undefined;
    let agentId: string | undefined;

    if (route.lane === "cloud-agent") {
      const spawn = await spawnCloudAgent({
        prompt: lastUser,
        botName: body.bot.name,
        projectName: body.project?.name ?? body.stationed?.name ?? null,
        github: body.project?.github ?? body.stationed?.github ?? null,
        neverMerge: ops.neverMerge,
        neverGuess: ops.neverGuess,
      });
      if (spawn.ok) {
        agentId = spawn.agentId;
        agentUrl = spawn.agentUrl;
      }
    }

    const workSystem =
      route.lane === "cloud-agent"
        ? `${system}

You are executing Jeff's request now inside Jeff OS Talk. Do NOT tell Jeff to paste into Cursor.
If a Cloud Agent is running, describe what it is doing.`
        : system;

    const result = await runGrokChat({
      messages,
      system: workSystem,
      prefer: route.lane === "cloud-agent" ? "paid" : route.lane,
    });

    let reply = result.reply;
    if (agentUrl) {
      reply = `${reply}\n\nCloud Agent started: ${agentUrl}`;
    }

    return NextResponse.json({
      reply,
      engine: result.engine,
      model: result.model,
      lane: route.lane === "cloud-agent" ? "cloud-agent" : result.lane,
      route,
      cloudAgents: { home: CLOUD_AGENTS_HOME },
      agentId,
      agentUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
