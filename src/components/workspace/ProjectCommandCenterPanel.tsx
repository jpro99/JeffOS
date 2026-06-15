"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import {
  resolveAddonsRelativePath,
  resolveGodBotRelativePath,
} from "@/lib/command-center/doc-paths";
import {
  JEFF_OS_DOCS_LABEL,
  JEFF_OS_DOCS_REL,
  JEFF_OS_READABLE_DOCS,
  jeffOsDocsAbsolutePath,
} from "@/lib/jeff-os/branding";
import { buildGodBotFromTemplate, defaultAddonsTemplate } from "@/lib/command-center/template";
import { cn } from "@/lib/utils";

type DocTab = "god-bot" | "addons" | "control-tower" | "project-index" | "worker-bots";

interface FileState {
  content: string;
  exists: boolean;
  modifiedAt: string | null;
  dirty: boolean;
}

async function loadFile(relativePath: string): Promise<Omit<FileState, "dirty">> {
  const res = await fetch(`/api/command-center/file?path=${encodeURIComponent(relativePath)}`);
  const data = (await res.json()) as {
    ok: boolean;
    content?: string;
    exists?: boolean;
    modifiedAt?: string | null;
    error?: string;
  };
  if (!data.ok) throw new Error(data.error ?? "Load failed");
  return {
    content: data.content ?? "",
    exists: data.exists ?? false,
    modifiedAt: data.modifiedAt ?? null,
  };
}

async function saveFile(relativePath: string, content: string) {
  const res = await fetch("/api/command-center/file", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: relativePath, content }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string; modifiedAt?: string | null };
  if (!data.ok) throw new Error(data.error ?? "Save failed");
  return data.modifiedAt ?? new Date().toISOString();
}

export function ProjectCommandCenterPanel({ project }: { project: Project }) {
  const { addActivity, updateProject } = useMissionControl();
  const godBotPath = resolveGodBotRelativePath(project);
  const addonsPath = resolveAddonsRelativePath(project);

  const [docTab, setDocTab] = useState<DocTab>("god-bot");
  const [godBot, setGodBot] = useState<FileState>({ content: "", exists: false, modifiedAt: null, dirty: false });
  const [addons, setAddons] = useState<FileState>({ content: "", exists: false, modifiedAt: null, dirty: false });
  const [refDocs, setRefDocs] = useState<Record<string, FileState>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeRelativePath = useMemo(() => {
    if (docTab === "god-bot") return godBotPath;
    if (docTab === "addons") return addonsPath;
    if (docTab === "control-tower") return "CONTROL_TOWER.md";
    if (docTab === "project-index") return "PROJECT_INDEX.md";
    if (docTab === "worker-bots") return "WORKER_BOTS.md";
    return godBotPath;
  }, [docTab, godBotPath, addonsPath]);

  const activeFile = useMemo(() => {
    if (docTab === "god-bot") return godBot;
    if (docTab === "addons") return addons;
    return refDocs[activeRelativePath] ?? { content: "", exists: false, modifiedAt: null, dirty: false };
  }, [docTab, godBot, addons, refDocs, activeRelativePath]);

  const isEditable = docTab === "god-bot" || docTab === "addons";

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [gb, ad] = await Promise.all([loadFile(godBotPath), loadFile(addonsPath)]);
      setGodBot({ ...gb, dirty: false });
      setAddons({ ...ad, dirty: false });

      const refs: Record<string, FileState> = {};
      for (const doc of JEFF_OS_READABLE_DOCS.filter((d) => d !== "PROJECT_GOD_BOT_TEMPLATE.md" && d !== "SETUP_GUIDE.md")) {
        const loaded = await loadFile(doc);
        refs[doc] = { ...loaded, dirty: false };
      }
      setRefDocs(refs);
    } catch (e) {
      setErr(e instanceof Error ? e.message : `Could not load ${JEFF_OS_DOCS_LABEL}`);
    } finally {
      setLoading(false);
    }
  }, [godBotPath, addonsPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setActiveContent = (content: string) => {
    if (docTab === "god-bot") setGodBot((s) => ({ ...s, content, dirty: true }));
    else if (docTab === "addons") setAddons((s) => ({ ...s, content, dirty: true }));
  };

  const openFolder = async (folderPath: string, label: string) => {
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/projects/open-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        addActivity(`Opened ${label}`, "project", project.id);
        setMsg(`Opened ${label} in Explorer`);
      } else {
        setErr(data.error ?? "Failed to open folder");
      }
    } catch {
      setErr("Run npm run dev locally to open folders");
    }
  };

  const handleSave = async () => {
    if (!isEditable) return;
    setSaving(true);
    setErr(null);
    try {
      const content = docTab === "god-bot" ? godBot.content : addons.content;
      const modifiedAt = await saveFile(activeRelativePath, content);
      addActivity(`Saved ${JEFF_OS_DOCS_LABEL}: ${activeRelativePath}`, "project", project.id);

      if (docTab === "god-bot") {
        setGodBot((s) => ({ ...s, exists: true, modifiedAt, dirty: false }));
        if (!project.godBotFile) {
          updateProject({ ...project, godBotFile: godBotPath });
        }
      } else {
        setAddons((s) => ({ ...s, exists: true, modifiedAt, dirty: false }));
      }
      setMsg("Saved to disk");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const createGodBot = () => {
    const content = buildGodBotFromTemplate(project);
    setGodBot({ content, exists: false, modifiedAt: null, dirty: true });
    setDocTab("god-bot");
    setMsg("Template loaded — edit then Save");
  };

  const createAddons = () => {
    const content = defaultAddonsTemplate(project);
    setAddons({ content, exists: false, modifiedAt: null, dirty: true });
    setDocTab("addons");
    setMsg("Add-ons template loaded — edit then Save");
  };

  const appendQuickNote = (section: string, line: string) => {
    const stamp = new Date().toISOString().slice(0, 10);
    const block = `\n- ${stamp} — ${line}\n`;
    if (docTab === "god-bot") {
      const next = godBot.content.includes(`## ${section}`)
        ? godBot.content.replace(
            new RegExp(`(## ${section}[\\s\\S]*?)(\\n## |$)`),
            `$1${block}$2`,
          )
        : `${godBot.content.trim()}\n\n## ${section}${block}`;
      setGodBot((s) => ({ ...s, content: next, dirty: true }));
    } else {
      const next = `${addons.content.trim()}\n\n## ${section}${block}`;
      setAddons((s) => ({ ...s, content: next, dirty: true }));
      setDocTab("addons");
    }
  };

  const docTabs: { id: DocTab; label: string; hint?: string }[] = [
    { id: "god-bot", label: "God Bot", hint: godBot.exists ? "on disk" : "missing" },
    { id: "addons", label: "Add-ons", hint: addons.exists ? "on disk" : "new" },
    { id: "control-tower", label: "Control Tower" },
    { id: "project-index", label: "Project Index" },
    { id: "worker-bots", label: "Worker Bots" },
  ];

  return (
    <div className="space-y-6">
      <Card className="space-y-4" glow>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>{JEFF_OS_DOCS_LABEL} — {project.name}</CardTitle>
            <CardDescription>
              Edit God Bot + add-ons on disk. Same markdown Cursor reads from{" "}
              <code className="text-teal-700">{JEFF_OS_DOCS_REL}/</code> inside Jeff OS.
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Reload
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {project.path && (
            <button
              type="button"
              onClick={() => void openFolder(project.path!, "project folder")}
              className="rounded-full bg-teal-500/15 px-4 py-2 text-sm font-medium text-teal-200 ring-1 ring-teal-500/25"
            >
              📁 Project folder
            </button>
          )}
          <button
            type="button"
            onClick={() => void openFolder(jeffOsDocsAbsolutePath(), JEFF_OS_DOCS_LABEL)}
            className="rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm text-zinc-200 hover:bg-white/[0.07]"
          >
            📂 {JEFF_OS_DOCS_LABEL}
          </button>
          <button
            type="button"
            onClick={() =>
              void openFolder(`${jeffOsDocsAbsolutePath()}\\projects`, "God Bot folder")
            }
            className="rounded-full border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
          >
            projects/
          </button>
          {project.path && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(project.path!);
                setMsg("Project path copied");
              }}
              className="rounded-full border border-white/[0.06] px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400"
            >
              Copy project path
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase text-zinc-600">God Bot file</p>
            <p className="mt-1 truncate font-mono text-[11px] text-teal-700/80">{godBotPath}</p>
            <p className="mt-1 text-[10px] text-zinc-600">
              {godBot.exists ? `Updated ${godBot.modifiedAt?.slice(0, 10) ?? "?"}` : "Not on disk yet"}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase text-zinc-600">Project path</p>
            <p className="mt-1 truncate font-mono text-[11px] text-zinc-500">
              {project.path ?? "No local path — scan or set in catalog"}
            </p>
          </div>
        </div>
      </Card>

      <p className="text-xs text-zinc-600">
        Paste errors and get fixes in the <strong className="text-zinc-500">Paste &amp; fix</strong> box at the top of this project page.
      </p>

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-white/[0.05] pb-2">
          {docTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDocTab(t.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition",
                docTab === t.id ? "bg-white/[0.06] text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {t.label}
              {t.hint ? (
                <span className="ml-1 text-[10px] text-zinc-600">({t.hint})</span>
              ) : null}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-zinc-600">Loading from disk…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] text-zinc-600">{activeRelativePath}</p>
              <div className="flex flex-wrap gap-2">
                {docTab === "god-bot" && !godBot.exists && (
                  <button
                    type="button"
                    onClick={createGodBot}
                    className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs text-amber-200 ring-1 ring-amber-500/20"
                  >
                    Create from template
                  </button>
                )}
                {docTab === "addons" && !addons.exists && (
                  <button
                    type="button"
                    onClick={createAddons}
                    className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs text-amber-200 ring-1 ring-amber-500/20"
                  >
                    Start add-ons file
                  </button>
                )}
                {isEditable && (
                  <>
                    <button
                      type="button"
                      onClick={() => appendQuickNote("Gotchas", "Jeff note from Jeff OS")}
                      className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-500"
                    >
                      + Gotcha
                    </button>
                    <button
                      type="button"
                      onClick={() => appendQuickNote("Session log", "Session note")}
                      className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-500"
                    >
                      + Session note
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving || !activeFile.dirty}
                      className="rounded-lg bg-teal-500/20 px-4 py-1.5 text-xs font-medium text-teal-200 ring-1 ring-teal-500/30 disabled:opacity-40"
                    >
                      {saving ? "Saving…" : activeFile.dirty ? "Save to disk" : "Saved"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <textarea
              value={activeFile.content}
              onChange={(e) => setActiveContent(e.target.value)}
              readOnly={!isEditable}
              rows={isEditable ? 22 : 16}
              spellCheck={false}
              className={cn(
                "w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-300",
                !isEditable && "opacity-90",
              )}
              placeholder={
                isEditable
                  ? "God Bot markdown — agents read this every session…"
                  : "Reference doc (read-only here — edit in Explorer if needed)"
              }
            />

            {activeFile.modifiedAt && (
              <p className="text-[10px] text-zinc-600">
                Last modified on disk: {activeFile.modifiedAt}
              </p>
            )}
          </>
        )}

        {msg && <p className="text-xs text-teal-600">{msg}</p>}
        {err && <p className="text-xs text-rose-400">{err}</p>}

        <p className="text-[10px] text-zinc-600">
          Saves go to{" "}
          <code className="text-zinc-500">{jeffOsDocsAbsolutePath().replace(/\\/g, "/")}</code>. Run dev
          locally — not on Vercel.
        </p>
      </Card>
    </div>
  );
}
