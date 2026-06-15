/** One-time setup + deploy hook helpers */

export { AUTO_DEPLOY_STEPS, buildPushLiveShellCommand, buildCursorPushLivePrompt } from "@/lib/deploy/push-live";

export const JEFF_OS_VERCEL_HINT = "project-command-lemon.vercel.app";

/** @deprecated Use buildPushLiveShellCommand(activeProject) — kept for legacy imports */
export const PUSH_LIVE_COMMAND =
  'cd "C:\\Projects\\Project Command\\jeff-mission-control"; npm run push-live';

export function deployHookConfigured(): boolean {
  return Boolean(process.env.VERCEL_DEPLOY_HOOK_URL?.trim());
}
