import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { isAllowedProjectPath } from "@/lib/project-scan/allowed-paths";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

/** Opens folder in Cursor CLI — localhost API only (npm run dev) */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { folderPath?: string };
    const folderPath = body.folderPath?.trim();

    if (!folderPath) {
      return NextResponse.json({ ok: false, error: "No folder path" }, { status: 400 });
    }

    if (!isAllowedProjectPath(folderPath)) {
      return NextResponse.json({ ok: false, error: "Path not in allowed project roots" }, { status: 403 });
    }

    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({ ok: false, error: "Folder not found on disk" }, { status: 404 });
    }

    try {
      await execFileAsync("cursor", [folderPath], { windowsHide: true });
    } catch {
      await execFileAsync("cmd.exe", ["/c", "start", "", "cursor", folderPath], { windowsHide: true });
    }

    return NextResponse.json({
      ok: true,
      message: `Opened ${folderPath} in Cursor — paste your prompt in agent chat`,
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
