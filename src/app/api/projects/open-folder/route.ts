import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { DEFAULT_PROJECTS_ROOT, EXTRA_SCAN_ROOTS } from "@/lib/discovery/catalog";
import { COMMAND_CENTER_ROOT } from "@/lib/command-center/paths";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const ALLOWED_ROOTS = [
  DEFAULT_PROJECTS_ROOT,
  ...EXTRA_SCAN_ROOTS,
  COMMAND_CENTER_ROOT,
].map((r) => path.normalize(r).toLowerCase());

function isAllowedPath(target: string): boolean {
  const normalized = path.normalize(target).toLowerCase();
  return ALLOWED_ROOTS.some((root) => normalized.startsWith(root));
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
