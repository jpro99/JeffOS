/** User-facing product name — use everywhere in UI */
export const JEFF_OS_NAME = "Jeff OS";

/** User-facing label for markdown docs (not a separate app) */
export const JEFF_OS_DOCS_LABEL = "Jeff OS docs";

/** Path inside the Jeff OS repo (shown in UI + Cursor prompts) */
export const JEFF_OS_DOCS_REL = "docs/command-center";

/** Default install location on Jeff's PC (open-folder buttons) */
export const JEFF_OS_INSTALL_ROOT = "C:\\Projects\\Project Command\\jeff-mission-control";

export function jeffOsDocsAbsolutePath(): string {
  return `${JEFF_OS_INSTALL_ROOT}\\docs\\command-center`;
}

/** Top-level markdown files in Jeff OS docs */
export const JEFF_OS_READABLE_DOCS = [
  "CONTROL_TOWER.md",
  "PROJECT_INDEX.md",
  "WORKER_BOTS.md",
  "SETUP_GUIDE.md",
  "PROJECT_GOD_BOT_TEMPLATE.md",
] as const;

/** Internal repo folder on disk — rarely shown to Jeff */
export const JEFF_OS_REPO_DIR = "jeff-mission-control";

/** Cursor prompt line: Read docs/... from Jeff OS repo */
export function formatDocsRead(relativePath: string): string {
  const rel = relativePath.replace(/\\/g, "/");
  return `Read ${JEFF_OS_DOCS_REL}/${rel}`;
}

export function standardDocsReadBlock(godBotRel: string): string {
  return `1. ${formatDocsRead("CONTROL_TOWER.md")}
2. ${formatDocsRead("PROJECT_INDEX.md")}
3. ${formatDocsRead(godBotRel)}`;
}
