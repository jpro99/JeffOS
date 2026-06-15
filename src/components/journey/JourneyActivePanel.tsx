"use client";

import { useCallback, useState } from "react";
import type { Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { createProjectFolderOnDisk } from "@/components/shared/ProjectLocationPicker";
import { ProjectLocationPicker, type ProjectLocationValue } from "@/components/shared/ProjectLocationPicker";
import { DEFAULT_PROJECTS_ROOT } from "@/lib/discovery/catalog";
import { resolveProjectPath } from "@/lib/mission/project-location";
import { openIssueSummary, type JourneyPhase } from "@/lib/mission/project-journey";
import { errorsToPasteText, dispatchPasteFixSeed } from "@/lib/intelligence/quick-action-guide";
import { analyzePaste, buildPasteFixPrompt } from "@/lib/mission/paste-fix";
import { EasyOrchestratePanel } from "@/components/easy/EasyOrchestratePanel";
import { EasyShipPanel } from "@/components/easy/EasyShipPanel";
import { LocalCommandTerminal } from "@/components/shared/LocalCommandTerminal";
import { copyToClipboard } from "@/lib/utils";

function ConnectCard({
  title,
  status,
  steps,
  actionLabel,
  onAction,
  href,
}: {
  title: string;
  status: string;
  steps: string[];
  actionLabel: string;
  onAction?: () => void;
  href?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-zinc-200">{title}</p>
        <span className="text-[10px] uppercase text-zinc-600">{status}</span>
      </div>
      <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-zinc-500">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/[0.05]"
          >
            Open signup
          </a>
        )}
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-full bg-teal-500/20 px-4 py-2 text-xs font-medium text-teal-200 ring-1 ring-teal-500/30"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

const DESKTOP = "C:\\Users\\Jeff Russell\\Desktop";

interface JourneyActivePanelProps {
  project: Project;
  phase: JourneyPhase;
  onFolderCreated?: () => void;
  onRefresh?: () => void;
}

export function JourneyActivePanel({ project, phase, onFolderCreated, onRefresh }: JourneyActivePanelProps) {
  const { state, updateProject, addActivity } = useMissionControl();
  const [msg, setMsg] = useState<string | null>(null);
  const [fixBusy, setFixBusy] = useState(false);
  const [location, setLocation] = useState<ProjectLocationValue>(() => ({
    parentFolder: project.path ? project.path.replace(/\\[^\\]+$/, "") : DESKTOP,
    targetPath: project.path ?? resolveProjectPath(DESKTOP, project.name),
  }));

  const targetPath =
    location.targetPath.trim() ||
    resolveProjectPath(location.parentFolder, project.name, location.targetPath || undefined);

  const createFolder = async () => {
    const path = resolveProjectPath(location.parentFolder, project.name, location.targetPath || undefined);
    const result = await createProjectFolderOnDisk(path);
    if (result.ok) {
      updateProject({ ...project, path, pathExists: true });
      addActivity(`Created folder: ${path}`, "project", project.id);
      setMsg(result.message);
      onFolderCreated?.();
    } else {
      setMsg(result.message);
    }
  };

  const openCursor = async () => {
    const folder = project.path ?? targetPath;
    const res = await fetch("/api/projects/open-in-cursor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderPath: folder }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setMsg(data.ok ? "Cursor opened — paste your prompt in agent chat" : data.error ?? "Run npm run dev locally");
  };

  const runFixNext = useCallback(async () => {
    if (!project.path) {
      setMsg("Create folder first");
      return;
    }
    setFixBusy(true);
    setMsg(null);
    try {
      const open = project.ops.errors.filter((e) => !e.resolved);
      if (open.length > 0) {
        dispatchPasteFixSeed(errorsToPasteText(open));
      }

      const res = await fetch("/api/projects/run-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, command: "npm run build" }),
      });
      const data = (await res.json()) as { ok: boolean; output?: string; message?: string };

      if (data.output) {
        dispatchPasteFixSeed(data.output);
        const analysis = analyzePaste(data.output, project);
        const prompt = buildPasteFixPrompt(data.output, project, state, analysis);
        await copyToClipboard(prompt);
        setMsg(
          data.ok
            ? "Build passed — click Refresh below to update status"
            : "Found errors — fix prompt copied. Paste in Cursor, then Refresh",
        );
      } else {
        setMsg(data.message ?? "Could not run build — is npm run dev running on localhost?");
      }
      onRefresh?.();
    } finally {
      setFixBusy(false);
    }
  }, [project, state, onRefresh]);

  if (phase === "folder") {
    return (
      <section className="space-y-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.06] p-5">
        <p className="text-sm text-zinc-400">
          Jeff OS creates an empty folder on your PC. Cursor fills it when you build. Default: Desktop — change below
          if you want.
        </p>
        <ProjectLocationPicker
          projectName={project.name}
          parentOptions={[DESKTOP, DEFAULT_PROJECTS_ROOT, ...state.settings.projectsRoots]}
          value={location}
          onChange={setLocation}
        />
        <button
          type="button"
          id="journey-create-folder"
          onClick={() => void createFolder()}
          className="w-full rounded-full bg-indigo-500 py-3.5 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          Create folder on my PC
        </button>
        {msg && <p className="text-sm text-teal-400">{msg}</p>}
      </section>
    );
  }

  if (phase === "connect") {
    const gh = project.connections?.find((c) => c.kind === "github");
    const vc = project.connections?.find((c) => c.kind === "vercel");
    return (
      <section className="space-y-4 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-5">
        <p className="text-sm text-zinc-400">
          Connect once per project. Jeff OS walks you through — you sign up on GitHub/Vercel if needed, then paste
          prompts in Cursor to wire the repo.
        </p>
        <ConnectCard
          title="GitHub"
          status={gh?.setupStatus ?? "not connected"}
          href="https://github.com/signup"
          steps={[
            "Sign up or log in at github.com",
            "Create a new empty repo (same name as your app is fine)",
            "In Cursor on your project folder: git init, git remote add origin, push",
            "Or copy the ship prompt in the Ship step",
          ]}
          actionLabel="Copy git setup hint"
          onAction={() =>
            void copyToClipboard(
              `cd "${project.path ?? targetPath}"\ngit init\ngit add .\ngit commit -m "Initial commit"\n# Create repo on GitHub, then:\ngit remote add origin YOUR_REPO_URL\ngit push -u origin main`,
            ).then(() => setMsg("Git commands copied"))
          }
        />
        <ConnectCard
          title="Vercel"
          status={vc?.setupStatus ?? "not connected"}
          href="https://vercel.com/signup"
          steps={[
            "Sign up at vercel.com (free tier works)",
            "Import your GitHub repo",
            "Root directory = your app folder if monorepo",
            "Every git push redeploys automatically",
          ]}
          actionLabel="Open Vercel docs"
          onAction={() => window.open("https://vercel.com/docs/getting-started-with-vercel", "_blank")}
        />
        <ConnectCard
          title="Cursor (where code gets written)"
          status={project.path ? "folder ready" : "need folder"}
          steps={[
            "Install Cursor from cursor.com if you have not",
            "Open your project folder in Cursor",
            "Use Agent chat — paste prompts from Jeff OS",
          ]}
          actionLabel="Open in Cursor"
          onAction={() => void openCursor()}
        />
        <button type="button" id="journey-open-cursor" className="hidden" onClick={() => void openCursor()} />
        {msg && <p className="text-sm text-teal-400">{msg}</p>}
      </section>
    );
  }

  if (phase === "build") {
    return (
      <section className="space-y-4">
        <EasyOrchestratePanel project={project} intent={project.orchestration?.scope.pitch} />
      </section>
    );
  }

  if (phase === "fix") {
    const open = project.ops.errors.filter((e) => !e.resolved);
    return (
      <section className="space-y-4 rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-5">
        <p className="text-sm font-medium text-rose-100">{openIssueSummary(project)}</p>
        {open.length > 0 && (
          <ul className="space-y-2">
            {open.map((e) => (
              <li key={e.id} className="rounded-lg border border-rose-500/20 bg-black/30 px-3 py-2 text-sm text-zinc-300">
                <strong className="text-zinc-200">{e.title}</strong>
                <p className="mt-1 text-xs text-zinc-500">{e.recommendedFix}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-zinc-500">
          Fix next runs <span className="font-mono">npm run build</span>, reads errors, copies a Cursor fix prompt.
          Paste in Cursor — Jeff OS cannot edit code from the browser alone.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            id="journey-fix-next"
            disabled={fixBusy}
            onClick={() => void runFixNext()}
            className="rounded-full bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
          >
            {fixBusy ? "Running build…" : "Fix next"}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-zinc-300"
          >
            Refresh status
          </button>
        </div>
        <LocalCommandTerminal project={project} defaultOpen />
        {msg && <p className="text-sm text-teal-400">{msg}</p>}
      </section>
    );
  }

  if (phase === "ship") {
    return <EasyShipPanel project={project} />;
  }

  if (phase === "done") {
    return (
      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-5">
        <p className="text-lg font-semibold text-emerald-200">Looking good</p>
        <p className="mt-2 text-sm text-zinc-400">
          Build verified or no open blockers. Add new ideas below, or use Fix if something breaks later.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-sm text-zinc-500">
      Use the buttons above — Plan is handled when you created this project. Jump to Folder if you have not yet.
    </section>
  );
}
