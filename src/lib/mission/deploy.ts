import type { GitStatusSnapshot } from "@/lib/project-scan/git-status";
import type { MissionControlState, Project } from "@/lib/types";
import { resolveGodBotRelativePath } from "@/lib/command-center/doc-paths";
import { formatDocsRead } from "@/lib/jeff-os/branding";

export type ShipAction = "github-push" | "vercel-ship" | "full-ship";

function connectionUrl(project: Project, kind: "github" | "vercel"): string | undefined {
  const conn = project.connections?.find((c) => c.kind === kind);
  return conn?.url ?? conn?.dashboardUrl;
}

function shipIntro(project: Project, state: MissionControlState): string {
  const godBot = resolveGodBotRelativePath(project);
  const caveman =
    state.settings.cavemanDefault ||
    project.jeffMode === "caveman" ||
    state.settings.jeffMode === "caveman";
  return `# SHIP — ${project.name}
Repo: ${project.path ?? "CONFIRM PATH"}
God Bot: ${formatDocsRead(godBot)}
Voice: ${caveman ? "CAVEman — short, direct" : "normal"}

Jeff OS does NOT auto-push. You run this in Cursor (or terminal).
`;
}

export function buildGitPushPrompt(
  project: Project,
  state: MissionControlState,
  git: GitStatusSnapshot,
): string {
  const gh = connectionUrl(project, "github") ?? git.remoteUrl ?? "(add origin remote)";
  return `${shipIntro(project, state)}
═══════════════════════════════════════
PUSH TO GITHUB
═══════════════════════════════════════
Git status: ${git.summary}
Branch: ${git.branch || "?"}
Remote: ${git.remoteUrl || "none"}
GitHub: ${gh}
Last commit: ${git.lastCommit || "none"}

Do in order:
1. cd "${project.path}"
2. git status
3. If changes: git add -A && git commit -m "fix: [one line what changed]"
4. git push origin ${git.branch || "main"}
5. Reply: PUSH DONE — branch + commit hash

Rules:
- Do not force-push main/master unless Jeff asks
- Run npm run build before commit if project has build script
- Minimal diff only
`;
}

export function buildVercelShipPrompt(
  project: Project,
  state: MissionControlState,
  git: GitStatusSnapshot,
  vercelLinked: boolean,
): string {
  const vercel = connectionUrl(project, "vercel") ?? "https://vercel.com/dashboard";
  return `${shipIntro(project, state)}
═══════════════════════════════════════
VERCEL DEPLOY (after GitHub push)
═══════════════════════════════════════
How Vercel works for Jeff:
- Jeff OS verify (Recheck project) = local build only. Does NOT deploy.
- Push to GitHub = Vercel auto-builds IF repo is connected (most projects).
- You do NOT need a separate "Vercel push" if GitHub → Vercel is linked.

Vercel linked on disk: ${vercelLinked ? "yes (.vercel folder)" : "not detected"}
Git: ${git.summary}
Dashboard: ${vercel}

Tasks:
1. Confirm latest commit is on GitHub (git log origin/${git.branch || "main"} -1)
2. Open Vercel dashboard → project → latest deployment
3. If deploy failed: read build log, fix, commit, push again
4. If deploy OK: reply VERCEL SHIP OK — production URL

Optional CLI (if vercel installed): vercel --prod
Only if Jeff uses CLI deploys — default is Git-triggered.
`;
}

export function buildFullShipPrompt(
  project: Project,
  state: MissionControlState,
  git: GitStatusSnapshot,
  vercelLinked: boolean,
  buildVerified: boolean,
): string {
  return `${buildGitPushPrompt(project, state, git)}

${buildVercelShipPrompt(project, state, git, vercelLinked)}

═══════════════════════════════════════
MISSION COMPLETE
═══════════════════════════════════════
When pushed + Vercel green, reply:
SHIP COMPLETE — GitHub pushed, Vercel deployed, Jeff can use prod URL

Build verified in Jeff OS before ship: ${buildVerified ? "yes" : "no — run Recheck project first"}
`;
}

export function buildShipPrompt(
  action: ShipAction,
  project: Project,
  state: MissionControlState,
  git: GitStatusSnapshot,
  opts: { vercelLinked?: boolean; buildVerified?: boolean } = {},
): string {
  if (action === "github-push") return buildGitPushPrompt(project, state, git);
  if (action === "vercel-ship") {
    return buildVercelShipPrompt(project, state, git, opts.vercelLinked ?? false);
  }
  return buildFullShipPrompt(
    project,
    state,
    git,
    opts.vercelLinked ?? false,
    opts.buildVerified ?? false,
  );
}

export function shipReadinessLabel(git: GitStatusSnapshot, buildVerified: boolean): {
  label: string;
  tone: "ready" | "wait" | "blocked";
  hint: string;
} {
  if (!git.isRepo) {
    return { label: "No git repo", tone: "blocked", hint: "Init git + add GitHub remote first" };
  }
  if (!git.hasRemote) {
    return { label: "No GitHub remote", tone: "blocked", hint: "Link origin to GitHub repo" };
  }
  if (!buildVerified) {
    return {
      label: "Verify build first",
      tone: "wait",
      hint: "Recheck project — then push. Local verify ≠ Vercel.",
    };
  }
  if (!git.clean) {
    return {
      label: "Uncommitted changes",
      tone: "wait",
      hint: "Copy Git push prompt → Cursor commits + pushes",
    };
  }
  if (git.ahead > 0) {
    return {
      label: "Ready to push",
      tone: "ready",
      hint: `${git.ahead} commit(s) waiting — push triggers Vercel if linked`,
    };
  }
  return {
    label: "Synced with GitHub",
    tone: "ready",
    hint: "Vercel auto-deploys on push — check dashboard for latest build",
  };
}
