import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  COMMAND_CENTER_ROOT,
  isSafeRelative,
  isUnderCommandCenter,
  isWritableRelative,
  toAbsolute,
} from "@/lib/command-center/paths";

export const runtime = "nodejs";

function statFile(absolutePath: string) {
  try {
    const stat = fs.statSync(absolutePath);
    return {
      exists: true,
      modifiedAt: stat.mtime.toISOString(),
      size: stat.size,
    };
  } catch {
    return { exists: false, modifiedAt: null as string | null, size: 0 };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const relativePath = searchParams.get("path")?.trim();

  if (!relativePath || !isSafeRelative(relativePath)) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  const absolutePath = toAbsolute(relativePath);
  if (!isUnderCommandCenter(absolutePath)) {
    return NextResponse.json({ ok: false, error: "Path outside Command Center" }, { status: 403 });
  }

  const meta = statFile(absolutePath);
  if (!meta.exists) {
    return NextResponse.json({
      ok: true,
      path: relativePath.replace(/\\/g, "/"),
      content: "",
      ...meta,
    });
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  return NextResponse.json({
    ok: true,
    path: relativePath.replace(/\\/g, "/"),
    content,
    ...meta,
  });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { path?: string; content?: string };
    const relativePath = body.path?.trim();
    const content = body.content ?? "";

    if (!relativePath || !isWritableRelative(relativePath)) {
      return NextResponse.json({ ok: false, error: "Path not writable" }, { status: 400 });
    }

    const absolutePath = toAbsolute(relativePath);
    if (!isUnderCommandCenter(absolutePath)) {
      return NextResponse.json({ ok: false, error: "Path outside Command Center" }, { status: 403 });
    }

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, "utf8");

    const meta = statFile(absolutePath);
    return NextResponse.json({
      ok: true,
      path: relativePath.replace(/\\/g, "/"),
      message: "Saved",
      ...meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({
    ok: true,
    root: COMMAND_CENTER_ROOT.replace(/\\/g, "/"),
    readable: ["CONTROL_TOWER.md", "PROJECT_INDEX.md", "WORKER_BOTS.md", "projects/*.md"],
  });
}
