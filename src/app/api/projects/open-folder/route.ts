import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { isAllowedCreatePath } from "@/lib/project-scan/create-folder";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

function isAllowedPath(target: string): boolean {
  return isAllowedCreatePath(target);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { folderPath?: string };
    const folderPath = body.folderPath?.trim();

    if (!folderPath) {
      return NextResponse.json({ ok: false, error: "No folder path" }, { status: 400 });
    }

    if (!isAllowedPath(folderPath)) {
      return NextResponse.json({ ok: false, error: "Path not in allowed project roots" }, { status: 403 });
    }

    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({ ok: false, error: "Folder not found on disk" }, { status: 404 });
    }

    await execFileAsync("explorer.exe", [folderPath], { windowsHide: true });

    return NextResponse.json({ ok: true, message: `Opened ${folderPath}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open folder";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
