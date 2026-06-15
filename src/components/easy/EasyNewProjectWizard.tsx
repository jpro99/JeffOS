"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMissionControl } from "@/lib/store/context";
import {
  BUILD_MODES,
  WIZARD_STEPS,
  botCardsFromProject,
  buildSuggestion,
  buildWizardLaunchPrompt,
  draftProject,
  planDraftProject,
  recommendScope,
  type BuildMode,
  type IntakeInput,
  type WizardStep,
} from "@/lib/mission/new-project-wizard";
import { applyBotsToProject } from "@/lib/mission/suggest-project-bots";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  ProjectLocationPicker,
  createProjectFolderOnDisk,
  type ProjectLocationValue,
} from "@/components/shared/ProjectLocationPicker";
import { CursorBuildPrerequisites } from "@/components/shared/CursorBuildPrerequisites";
import { DEFAULT_PROJECTS_ROOT } from "@/lib/discovery/catalog";
import { resolveProjectPath } from "@/lib/mission/project-location";
import { suggestNameFromPitch } from "@/lib/mission/project-journey";
import { cn, copyToClipboard } from "@/lib/utils";

const PLATFORMS = ["web", "mobile", "desktop", "api"];

function WizardStepBar({
  step,
  onNext,
  nextLabel,
  nextDisabled,
  showBack,
  onBack,
}: {
  step: WizardStep;
  onNext?: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  onBack?: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-white/[0.08] bg-[#0a0b0e]/95 px-4 py-3 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        {WIZARD_STEPS.map((s) => (
          <span
            key={s.step}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-medium",
              s.step === step
                ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-500/30"
                : s.step < step
                  ? "text-zinc-500"
                  : "text-zinc-700",
            )}
          >
            {s.step}. {s.label}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {showBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Back
          </button>
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="min-h-[44px] flex-1 rounded-full bg-teal-500 px-8 py-3 text-sm font-semibold text-black hover:bg-teal-400 disabled:opacity-40 sm:flex-none"
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function EasyNewProjectWizard() {
  const router = useRouter();
  const { state, createProject, updateProject, openWorkspace, addActivity } = useMissionControl();

  const [step, setStep] = useState<WizardStep>(1);
  const [buildMode, setBuildMode] = useState<BuildMode>("god");
  const [acceptedSuggestion, setAcceptedSuggestion] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState<IntakeInput>({
    name: "",
    pitch: "",
    description: "",
    goals: [],
    platforms: ["web"],
  });
  const [goalsText, setGoalsText] = useState("");
  const [location, setLocation] = useState<ProjectLocationValue>(() => ({
    parentFolder: "C:\\Users\\Jeff Russell\\Desktop",
    targetPath: "",
  }));
  const [folderCreated, setFolderCreated] = useState(false);

  const resolvedTargetPath = useMemo(
    () => resolveProjectPath(location.parentFolder, form.name, location.targetPath || undefined),
    [location.parentFolder, location.targetPath, form.name],
  );

  const intakeForRec = useMemo(
    (): IntakeInput => ({
      ...form,
      goals: goalsText
        .split("\n")
        .map((g) => g.trim())
        .filter(Boolean),
      parentFolder: location.parentFolder,
      targetPath: resolvedTargetPath,
    }),
    [form, goalsText, location.parentFolder, resolvedTargetPath],
  );

  const liveRec = useMemo(
    () =>
      intakeForRec.pitch.trim().length > 3 ? recommendScope(intakeForRec) : null,
    [intakeForRec],
  );

  const draft = useMemo(
    () => draftProject(intakeForRec, state.bots),
    [intakeForRec, state.bots],
  );

  const suggestion = useMemo(
    () => (step >= 2 ? buildSuggestion(draft, state.bots) : null),
    [draft, state.bots, step],
  );

  const planned = useMemo(
    () => (step >= 3 ? planDraftProject(draft, state.bots, buildMode) : null),
    [draft, state.bots, buildMode, step],
  );

  const botCards = useMemo(
    () => (planned ? botCardsFromProject(planned) : []),
    [planned],
  );

  const canNextStep1 = form.name.trim().length > 0 && form.pitch.trim().length > 3;

  const togglePlatform = (p: string) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  };

  const goStep2 = () => {
    if (!canNextStep1) {
      setMsg("Name + one-line pitch required");
      return;
    }
    setMsg(null);
    setAcceptedSuggestion(false);
    setStep(2);
  };

  const acceptSuggestion = () => {
    setAcceptedSuggestion(true);
    setStep(3);
    setMsg(null);
  };

  const rejectSuggestion = () => {
    setStep(1);
    setMsg("Edit your idea — then Next again");
  };

  const goStep4 = () => {
    if (!acceptedSuggestion) return;
    setStep(4);
    setMsg(null);
  };

  const launchBuild = async () => {
    const intake: IntakeInput = intakeForRec;
    const targetPath = resolvedTargetPath;

    const preview = applyBotsToProject(
      planDraftProject(draftProject(intake, state.bots), state.bots, buildMode),
      state.bots,
      buildMode,
    );
    const withPath = { ...preview, path: targetPath, pathExists: false };
    const launch = buildWizardLaunchPrompt(withPath, buildMode, state);
    if (!launch) {
      setMsg("Could not build prompt — check your idea fields");
      return;
    }

    const created = createProject(intake);
    const folderResult = await createProjectFolderOnDisk(targetPath);

    updateProject({
      ...launch.project,
      id: created.id,
      slug: created.slug,
      path: targetPath,
      pathExists: folderResult.ok,
      connections: created.connections,
      costProfile: created.costProfile,
    });
    openWorkspace(created.id);
    setCreatedId(created.id);
    setPrompt(launch.prompt);

    try {
      await copyToClipboard(launch.prompt);
      setMsg(
        folderResult.ok
          ? `Folder ready at ${targetPath} — prompt copied. Paste in Cursor.`
          : `${folderResult.message} — prompt copied.`,
      );
    } catch {
      setMsg(folderResult.ok ? `Folder at ${targetPath} — select prompt below and copy` : "Prompt ready — tap Copy below");
    }
    addActivity(`New app wizard: ${created.name} at ${targetPath} (${buildMode})`, "project", created.id);
    router.push(`/easy/projects/${created.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/easy/projects" className="text-sm text-zinc-600 hover:text-teal-500">
          ← Projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-50">New project</h1>
        <p className="mt-1 text-sm text-zinc-500">
          What do you want to create today? Type it → Go → folder → build. Stay at the top — keep tapping Next.
        </p>
      </div>

      {step === 1 && (
        <>
          <WizardStepBar
            step={1}
            nextLabel="Go → AI plan"
            onNext={goStep2}
            nextDisabled={!canNextStep1}
          />
          <section className="space-y-4 rounded-2xl border border-teal-500/20 bg-teal-500/[0.05] p-5">
            <p className="text-lg font-medium text-zinc-100">What do you want to create today?</p>
            <label className="block text-xs text-zinc-600">
              Tell Jeff OS in plain words
              <textarea
                value={form.pitch}
                onChange={(e) => {
                  const pitch = e.target.value;
                  setForm((f) => ({
                    ...f,
                    pitch,
                    name: f.name.trim() ? f.name : suggestNameFromPitch(pitch),
                  }));
                }}
                rows={5}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700"
                placeholder="Example: A study app for nurse practitioner exams with flashcards and practice tests on web and phone"
              />
            </label>
            <label className="block text-xs text-zinc-600">
              App name (auto-filled — edit if you want)
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-zinc-200"
                placeholder="Nurse Practitioner Study"
              />
            </label>
            <label className="block text-xs text-zinc-600">
              Description
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-zinc-200"
                placeholder="Who is it for? What problem does it solve?"
              />
            </label>
            <label className="block text-xs text-zinc-600">
              Goals (one per line)
              <textarea
                value={goalsText}
                onChange={(e) => setGoalsText(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-zinc-200"
                placeholder={"Launch MVP in 2 weeks\nStripe billing\nMobile-friendly"}
              />
            </label>
            <div>
              <p className="text-xs text-zinc-600">Platforms</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs capitalize",
                      form.platforms.includes(p)
                        ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-500/30"
                        : "border border-white/10 text-zinc-500",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {liveRec && form.platforms.length > 0 && (
              <div className="space-y-3 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400/90">
                  Auto preview — updates as you type
                </p>
                <div>
                  <p className="text-xs font-medium text-zinc-400">Recommended tech</p>
                  <ul className="mt-1 space-y-1">
                    {liveRec.techLines.map((line) => (
                      <li key={line} className="text-xs text-zinc-300">
                        · {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400">Recommended timeline</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-300">{liveRec.timeline}</p>
                </div>
              </div>
            )}
          </section>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={goStep2}
              disabled={!canNextStep1}
              className="rounded-full bg-teal-500 px-8 py-3 text-sm font-semibold text-black hover:bg-teal-400 disabled:opacity-40"
            >
              Go → AI plan
            </button>
          </div>
        </>
      )}

      {step === 2 && suggestion && (
        <>
          <WizardStepBar step={2} showBack onBack={() => setStep(1)} nextLabel="" />
          <section className="space-y-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/80">
              Step 2 — This is what we suggest
            </p>
            <h2 className="text-lg font-semibold text-zinc-100">{suggestion.headline}</h2>
            <p className="text-sm leading-relaxed text-zinc-400">{suggestion.approach}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">
                  Recommended tech preferences
                </p>
                <p className="mt-2 text-[11px] text-zinc-500">{suggestion.techRationale}</p>
                <ul className="mt-3 space-y-1.5">
                  {suggestion.techLines.map((line) => (
                    <li key={line} className="text-sm text-zinc-200">
                      · {line}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                  Recommended timeline
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-200">{suggestion.timeline}</p>
                <ul className="mt-3 space-y-2">
                  {suggestion.timelinePhases.map((p) => (
                    <li key={p.phase} className="text-xs text-zinc-400">
                      <span className="text-zinc-300">{p.phase}</span>
                      <span className="text-zinc-600"> — {p.duration}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-zinc-600">Est. budget: {suggestion.budget}</p>
              </div>
            </div>

            <p className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-sm text-teal-200/90">
              {suggestion.mvpNote}
            </p>
            <div>
              <p className="text-[10px] uppercase text-zinc-600">Features we&apos;d build</p>
              <ul className="mt-2 space-y-1">
                {suggestion.featureNames.map((name) => (
                  <li key={name} className="text-sm text-zinc-300">
                    · {name}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-400">Bots:</span> {suggestion.botSummary}
            </p>
          </section>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={acceptSuggestion}
              className="min-h-[44px] flex-1 rounded-full bg-teal-500 px-8 py-3 text-sm font-semibold text-black hover:bg-teal-400 sm:flex-none"
            >
              Yes — looks good → Next
            </button>
            <button
              type="button"
              onClick={rejectSuggestion}
              className="min-h-[44px] rounded-full border border-white/15 px-8 py-3 text-sm text-zinc-400 hover:text-zinc-200"
            >
              No — edit my idea
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <WizardStepBar
            step={3}
            showBack
            onBack={() => setStep(2)}
            nextLabel="Next → Launch"
            onNext={goStep4}
            nextDisabled={!folderCreated}
          />
          <section className="space-y-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.06] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
              Step 3 — Create folder on your PC
            </p>
            <p className="text-sm text-zinc-400">
              Jeff OS needs a folder before Cursor can write code. Default is Desktop — change if you want.
            </p>
            <ProjectLocationPicker
              projectName={form.name}
              parentOptions={["C:\\Users\\Jeff Russell\\Desktop", ...state.settings.projectsRoots]}
              value={{
                parentFolder: location.parentFolder,
                targetPath: location.targetPath || resolvedTargetPath,
              }}
              onChange={setLocation}
            />
            <button
              type="button"
              onClick={async () => {
                const path = resolvedTargetPath;
                const result = await createProjectFolderOnDisk(path);
                setFolderCreated(result.ok);
                setMsg(result.message);
              }}
              className="w-full rounded-full bg-indigo-500 py-4 text-base font-semibold text-white hover:bg-indigo-400"
            >
              Create folder on my PC
            </button>
            {folderCreated && (
              <p className="text-sm text-emerald-400">Folder ready — tap Next → Launch</p>
            )}
          </section>
        </>
      )}

      {step === 4 && (
        <>
          <WizardStepBar
            step={4}
            showBack
            onBack={() => setStep(3)}
            nextLabel={createdId ? "Open project →" : "Create project →"}
            onNext={() => {
              if (createdId) router.push(`/easy/projects/${createdId}`);
              else void launchBuild();
            }}
          />
          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Step 4 — Pick build mode
            </p>
            <p className="text-sm text-zinc-500">Who builds what — then one copy-paste into Cursor.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {BUILD_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setBuildMode(mode.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition",
                    buildMode === mode.id
                      ? "border-teal-500/40 bg-teal-500/10 ring-1 ring-teal-500/25"
                      : "border-white/[0.08] bg-black/20 hover:border-white/15",
                  )}
                >
                  <p className="font-semibold text-zinc-100">{mode.label}</p>
                  <p className="mt-1 text-xs text-teal-600/90">{mode.tagline}</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{mode.detail}</p>
                </button>
              ))}
            </div>
          </section>

          {botCards.length > 0 && (
            <section className="space-y-3 rounded-2xl border border-white/[0.06] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Who builds what
              </p>
              <ul className="space-y-2">
                {botCards.map((card) => (
                  <li
                    key={card.botType}
                    className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-zinc-200">{card.role}</p>
                    <p className="mt-1 text-xs text-teal-700/80">
                      → {card.featureNames.join(", ") || "assigned features"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-4 rounded-2xl border border-teal-500/25 bg-teal-500/5 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">
              Create project in Jeff OS
            </p>
            <p className="text-sm text-zinc-400">
              Folder: <span className="font-mono text-teal-600/90">{resolvedTargetPath}</span> — opens the build
              flow at the top. Paste prompt in Cursor when asked.
            </p>
            {!createdId ? (
              <button
                type="button"
                onClick={() => void launchBuild()}
                className="w-full rounded-full bg-teal-500 py-4 text-base font-semibold text-black hover:bg-teal-400"
              >
                Build it — copy prompt
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-emerald-300">
                  Project created at{" "}
                  <span className="font-mono text-emerald-200/80">{resolvedTargetPath}</span>
                </p>
                {planned && (
                  <CursorBuildPrerequisites
                    project={{
                      ...planned,
                      id: createdId ?? planned.id,
                      path: resolvedTargetPath,
                      pathExists: true,
                    }}
                  />
                )}
                <CopyButton text={prompt} label="Copy prompt again" />
                <Link
                  href={`/easy/projects/${createdId}`}
                  className="block rounded-full bg-white/[0.08] py-3 text-center text-sm font-medium text-zinc-200 ring-1 ring-white/10"
                >
                  Open project in Easy Mode →
                </Link>
              </div>
            )}
            {prompt && (
              <textarea
                readOnly
                value={prompt}
                rows={8}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] text-zinc-500"
              />
            )}
          </section>
        </>
      )}

      {msg && <p className="text-center text-sm text-teal-500">{msg}</p>}
    </div>
  );
}
