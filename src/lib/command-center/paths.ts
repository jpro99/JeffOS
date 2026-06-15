import "server-only";
import fs from "fs";
import path from "path";
import {
  JEFF_OS_READABLE_DOCS,
  formatDocsRead,
  standardDocsReadBlock,
} from "@/lib/jeff-os/branding";
import {
  enrichProjectGodBotFile,
  resolveAddonsRelativePath,
  resolveGodBotRelativePath,
} from "@/lib/command-center/doc-paths";

export {
  enrichProjectGodBotFile,
  resolveAddonsRelativePath,
  resolveGodBotRelativePath,
} from "@/lib/command-center/doc-paths";

export {
  JEFF_OS_NAME,
  JEFF_OS_DOCS_LABEL,
  JEFF_OS_DOCS_REL,
  JEFF_OS_REPO_DIR,
  formatDocsRead,
  standardDocsReadBlock,
} from "@/lib/jeff-os/branding";

/** Legacy folder at Project Command root — fallback only */
const LEGACY_DOCS_ROOT = path.normalize("C:\\Projects\\Project Command\\AI-COMMAND-CENTER");

function repoDocsRoot(): string {
  return path.normalize(path.join(process.cwd(), "docs", "command-center"));
}

/** Absolute path to Jeff OS markdown docs on disk */
export function resolveCommandCenterRoot(): string {
  const inRepo = repoDocsRoot();
  if (fs.existsSync(inRepo)) return inRepo;
  if (fs.existsSync(LEGACY_DOCS_ROOT)) return LEGACY_DOCS_ROOT;
  return inRepo;
}

export function getCommandCenterRoot(): string {
  return resolveCommandCenterRoot();
}

/** @deprecated prefer getCommandCenterRoot() */
export const COMMAND_CENTER_ROOT = resolveCommandCenterRoot();

/** Absolute path for prompts when full path helps Cursor */
export function formatDocsReadAbsolute(relativePath: string): string {
  return `Read ${path.join(resolveCommandCenterRoot(), relativePath).replace(/\\/g, "/")}`;
}

export const READABLE_DOCS = JEFF_OS_READABLE_DOCS;

export function toAbsolute(relativePath: string): string {
  return path.normalize(path.join(resolveCommandCenterRoot(), relativePath.replace(/\//g, path.sep)));
}

export function isUnderCommandCenter(absolutePath: string): boolean {
  const root = resolveCommandCenterRoot().toLowerCase();
  const normalized = path.normalize(absolutePath).toLowerCase();
  return normalized.startsWith(root);
}

export function isSafeRelative(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.includes("..")) return false;
  if (READABLE_DOCS.includes(normalized as (typeof READABLE_DOCS)[number])) return true;
  if (/^projects\/[a-z0-9-]+\.md$/i.test(normalized)) return true;
  if (/^projects\/[a-z0-9-]+-addons\.md$/i.test(normalized)) return true;
  return false;
}

export function isWritableRelative(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.includes("..")) return false;
  return /^projects\/[a-z0-9-]+(-addons)?\.md$/i.test(normalized);
}

