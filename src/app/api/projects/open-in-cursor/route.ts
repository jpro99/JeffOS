import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { isAllowedProjectPath } from "@/lib/project-scan/allowed-paths";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const PROMPT_REL = path.join(".jeff-os", "last-agent-prompt.md");

async function openCursor(targets: string[]) {
  try {
    await execFileAsync("cursor", targets, { windowsHide: true });
  } catch {
    await execFileAsync("cmd.exe", ["/c", "start", "", "cursor", ...targets], { windowsHide: true });
  }
}

/**
 * Opens project in Cursor (localhost only).
 * Optional `prompt` writes `.jeff-os/last-agent-prompt.md` and opens that file too.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { folderPath?: string; prompt?: string };
    const folderPath = body.folderPath?.trim();
    const prompt = body.prompt?.trim();

    if (!folderPath) {
      return NextResponse.json({ ok: false, error: "No folder path" }, { status: 400 });
    }

    if (!isAllowedProjectPath(folderPath)) {
      return NextResponse.json({ ok: false, error: "Path not in allowed project roots" }, { status: 403 });
    }

    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({ ok: false, error: "Folder not found on disk" }, { status: 404 });
    }

    let promptFile: string | null = null;
    if (prompt) {
      const dir = path.join(folderPath, ".jeff-os");
      fs.mkdirSync(dir, { recursive: true });
      promptFile = path.join(folderPath, PROMPT_REL);
      const stamped = `# Jeff OS → Cursor (paste or @ this file in Agent)\n\nGenerated: ${new Date().toISOString()}\n\n---\n\n${prompt}\n`;
      fs.writeFileSync(promptFile, stamped, "utf8");
    }

    if (promptFile) {
      try {
        await openCursor([promptFile]);
      } catch {
        await openCursor([folderPath]);
      }
    } else {
      await openCursor([folderPath]);
    }

    return NextResponse.json({
      ok: true,
      promptFile: promptFile ? PROMPT_REL.replace(/\\/g, "/") : null,
      message: promptFile
        ? `Opened Cursor with ${PROMPT_REL.replace(/\\/g, "/")} — paste clipboard or @ that file in Agent`
        : `Opened ${folderPath} in Cursor — paste your prompt in agent chat`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open Cursor";
    return NextResponse.json(
      {
        ok: false,
        error: `${message}. Install Cursor CLI or open the folder manually.`,
      },
      { status: 500 },
    );
  }
}
