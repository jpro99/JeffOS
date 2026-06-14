"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { seedState, STORAGE_KEY } from "@/lib/seed/data";
import { migrateState } from "@/lib/os/migrate";
import { computeRouting } from "@/lib/routing/engine";
import { resolveQuickCommand } from "@/lib/intelligence/commands";
import { createProjectShell } from "@/lib/orchestration/defaults";
import { attachConnections } from "@/lib/connections/helpers";
import { uid } from "@/lib/utils";
import type {
  ActivityEntry,
  AppSettings,
  MissionControlState,
  Project,
  QuickCommandId,
  RoutingDecision,
  RoutingHistoryEntry,
  RoutingPreset,
  Task,
  WorkspaceState,
} from "@/lib/types";

type Action =
  | { type: "HYDRATE"; payload: MissionControlState }
  | { type: "UPDATE_SETTINGS"; payload: Partial<AppSettings> }
  | { type: "UPDATE_PROJECT"; payload: Project }
  | { type: "UPDATE_TASK"; payload: Task }
  | { type: "ADD_TASK"; payload: Task }
  | { type: "ADD_PRESET"; payload: RoutingPreset }
  | { type: "ADD_ROUTING_HISTORY"; payload: RoutingHistoryEntry }
  | { type: "ADD_ACTIVITY"; payload: ActivityEntry }
  | { type: "SET_WORKSPACE"; payload: Partial<WorkspaceState> }
  | { type: "SET_VOICE"; payload: Partial<import("@/lib/types").VoicePersistedState> }
  | { type: "SYNC_PROJECTS"; payload: { projects: Project[]; scannedAt: string; count: number } }
  | { type: "ADD_PROJECT"; payload: Project }
  | { type: "RESET" };

function reducer(state: MissionControlState, action: Action): MissionControlState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case "UPDATE_PROJECT":
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? action.payload : t)),
      };
    case "ADD_TASK":
      return {
        ...state,
        tasks: [action.payload, ...state.tasks],
        workspace: {
          ...state.workspace,
          queueTaskIds: [action.payload.id, ...state.workspace.queueTaskIds],
        },
      };
    case "ADD_PRESET":
      return { ...state, routingPresets: [...state.routingPresets, action.payload] };
    case "ADD_ROUTING_HISTORY":
      return { ...state, routingHistory: [action.payload, ...state.routingHistory].slice(0, 100) };
    case "ADD_ACTIVITY":
      return { ...state, activity: [action.payload, ...state.activity].slice(0, 100) };
    case "SET_WORKSPACE":
      return { ...state, workspace: { ...state.workspace, ...action.payload } };
    case "SET_VOICE":
      return {
        ...state,
        workspace: {
          ...state.workspace,
          voice: { ...state.workspace.voice, ...action.payload },
        },
      };
    case "SYNC_PROJECTS":
      return {
        ...state,
        projects: action.payload.projects,
        settings: {
          ...state.settings,
          lastDiscoveryAt: action.payload.scannedAt,
          lastDiscoveryCount: action.payload.count,
        },
      };
    case "ADD_PROJECT":
      return {
        ...state,
        projects: [...state.projects, action.payload],
        workspace: {
          ...state.workspace,
          activeProjectId: action.payload.id,
          openWorkspaceIds: [...new Set([...state.workspace.openWorkspaceIds, action.payload.id])],
          recentProjectIds: [action.payload.id, ...state.workspace.recentProjectIds.filter((id) => id !== action.payload.id)].slice(0, 8),
        },
      };
    case "RESET":
      return seedState;
    default:
      return state;
  }
}

interface MissionControlContextValue {
  state: MissionControlState;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateProject: (project: Project) => void;
  updateTask: (task: Task) => void;
  addTask: (task: Task) => void;
  addPreset: (preset: RoutingPreset) => void;
  addRoutingHistory: (entry: RoutingHistoryEntry) => void;
  addActivity: (message: string, type: ActivityEntry["type"], projectId?: string) => void;
  resetData: () => void;
  getProject: (id: string) => Project | undefined;
  getBot: (id: string) => MissionControlState["bots"][0] | undefined;
  activeProject: Project | undefined;
  activeTask: Task | undefined;
  switchProject: (projectId: string) => void;
  focusTask: (taskId: string | null) => void;
  setRoute: (route: RoutingDecision, mode?: "auto" | "manual") => void;
  setRouteOverride: (patch: Partial<Pick<RoutingDecision, "interface" | "botId" | "modelClass" | "botType">>) => void;
  recomputeActiveRoute: () => void;
  promoteTaskInQueue: (taskId: string) => void;
  openWorkspace: (projectId: string) => void;
  closeWorkspace: (projectId: string) => void;
  minimizeWorkspace: (projectId: string) => void;
  restoreWorkspace: (projectId: string) => void;
  togglePinProject: (projectId: string) => void;
  setHandoffNote: (note: string) => void;
  setVoicePersisted: (patch: Partial<import("@/lib/types").VoicePersistedState>) => void;
  syncProjectsFromDisk: () => Promise<{ ok: boolean; message: string }>;
  createProject: (input: {
    name: string;
    pitch: string;
    description: string;
    goals: string[];
    platforms: string[];
  }) => Project;
  runQuickCommand: (projectId: string, commandId: import("@/lib/types").QuickCommandId) => { prompt: string; label: string };
}

const MissionControlContext = createContext<MissionControlContextValue | null>(null);

export function MissionControlProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, seedState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", payload: migrateState(JSON.parse(raw)) });
    } catch {
      /* seed */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state]);

  const addActivity = useCallback(
    (message: string, type: ActivityEntry["type"], projectId?: string) => {
      dispatch({
        type: "ADD_ACTIVITY",
        payload: {
          id: uid("act"),
          type,
          message,
          projectId,
          createdAt: new Date().toISOString(),
        },
      });
    },
    [],
  );

  const activeProject = state.projects.find((p) => p.id === state.workspace.activeProjectId);
  const activeTask = state.tasks.find((t) => t.id === state.workspace.activeTaskId);

  const switchProject = useCallback(
    (projectId: string) => {
      const recent = [projectId, ...state.workspace.recentProjectIds.filter((id) => id !== projectId)].slice(0, 8);
      const open = state.workspace.openWorkspaceIds.includes(projectId)
        ? state.workspace.openWorkspaceIds
        : [...state.workspace.openWorkspaceIds, projectId];
      dispatch({
        type: "SET_WORKSPACE",
        payload: {
          activeProjectId: projectId,
          recentProjectIds: recent,
          openWorkspaceIds: open,
          minimizedProjectIds: state.workspace.minimizedProjectIds.filter((id) => id !== projectId),
        },
      });
      const p = state.projects.find((x) => x.id === projectId);
      addActivity(`Switched workspace → ${p?.name ?? projectId}`, "project", projectId);
    },
    [state.workspace, state.projects, addActivity],
  );

  const focusTask = useCallback(
    (taskId: string | null) => {
      const task = taskId ? state.tasks.find((t) => t.id === taskId) : undefined;
      dispatch({
        type: "SET_WORKSPACE",
        payload: {
          activeTaskId: taskId,
          activeProjectId: task?.projectId ?? state.workspace.activeProjectId,
          activeRoute: task?.recommendedRoute ?? state.workspace.activeRoute,
        },
      });
      if (task) addActivity(`Focused task: ${task.title}`, "task", task.projectId);
    },
    [state.tasks, state.workspace.activeProjectId, state.workspace.activeRoute, addActivity],
  );

  const setRoute = useCallback((route: RoutingDecision, mode: "auto" | "manual" = "auto") => {
    dispatch({ type: "SET_WORKSPACE", payload: { activeRoute: route, routeMode: mode } });
  }, []);

  const recomputeActiveRoute = useCallback(() => {
    const project = state.projects.find((p) => p.id === state.workspace.activeProjectId);
    const task = state.tasks.find((t) => t.id === state.workspace.activeTaskId);
    const route = computeRouting({
      taskType: task?.taskType ?? "feature",
      taskSize: task?.taskSize ?? "medium",
      optimizeFor: "speed",
      autonomyLevel: "medium",
      riskLevel: "medium",
      costSensitivity: state.settings.costSaveMode ? "high" : "medium",
      project,
      settings: state.settings,
      presets: state.routingPresets,
      bots: state.bots,
    });
    dispatch({ type: "SET_WORKSPACE", payload: { activeRoute: route, routeMode: "auto" } });
  }, [state]);

  const setRouteOverride = useCallback(
    (patch: Partial<Pick<RoutingDecision, "interface" | "botId" | "modelClass" | "botType">>) => {
      const current = state.workspace.activeRoute;
      if (!current) return;
      const botId =
        patch.botId ??
        (patch.botType ? state.bots.find((b) => b.type === patch.botType)?.id : undefined) ??
        current.botId;
      dispatch({
        type: "SET_WORKSPACE",
        payload: {
          activeRoute: {
            ...current,
            ...patch,
            botId,
            reasons: ["Manual override in Jeff OS", ...current.reasons.slice(0, 2)],
            confidence: 1,
          },
          routeMode: "manual",
        },
      });
    },
    [state.workspace.activeRoute, state.bots],
  );

  const promoteTaskInQueue = useCallback((taskId: string) => {
    dispatch({
      type: "SET_WORKSPACE",
      payload: {
        queueTaskIds: [taskId, ...state.workspace.queueTaskIds.filter((id) => id !== taskId)],
        activeTaskId: taskId,
      },
    });
  }, [state.workspace.queueTaskIds]);

  const openWorkspace = useCallback(
    (projectId: string) => {
      switchProject(projectId);
    },
    [switchProject],
  );

  const closeWorkspace = useCallback((projectId: string) => {
    const remaining = state.workspace.openWorkspaceIds.filter((id) => id !== projectId);
    dispatch({
      type: "SET_WORKSPACE",
      payload: {
        openWorkspaceIds: remaining,
        minimizedProjectIds: state.workspace.minimizedProjectIds.filter((id) => id !== projectId),
        activeProjectId:
          state.workspace.activeProjectId === projectId
            ? remaining[0] ?? null
            : state.workspace.activeProjectId,
      },
    });
  }, [state.workspace]);

  const minimizeWorkspace = useCallback((projectId: string) => {
    dispatch({
      type: "SET_WORKSPACE",
      payload: {
        minimizedProjectIds: [...new Set([...state.workspace.minimizedProjectIds, projectId])],
      },
    });
  }, [state.workspace.minimizedProjectIds]);

  const restoreWorkspace = useCallback((projectId: string) => {
    dispatch({
      type: "SET_WORKSPACE",
      payload: {
        minimizedProjectIds: state.workspace.minimizedProjectIds.filter((id) => id !== projectId),
        activeProjectId: projectId,
      },
    });
  }, [state.workspace.minimizedProjectIds]);

  const togglePinProject = useCallback((projectId: string) => {
    const pinned = state.workspace.pinnedProjectIds.includes(projectId)
      ? state.workspace.pinnedProjectIds.filter((id) => id !== projectId)
      : [...state.workspace.pinnedProjectIds, projectId];
    dispatch({ type: "SET_WORKSPACE", payload: { pinnedProjectIds: pinned } });
  }, [state.workspace.pinnedProjectIds]);

  const setHandoffNote = useCallback((note: string) => {
    dispatch({ type: "SET_WORKSPACE", payload: { handoffNote: note } });
  }, []);

  const setVoicePersisted = useCallback((patch: Partial<import("@/lib/types").VoicePersistedState>) => {
    dispatch({ type: "SET_VOICE", payload: patch });
  }, []);

  const syncProjectsFromDisk = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await fetch("/api/projects/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roots: state.settings.projectsRoots,
          includeUnknown: state.settings.discoverUnknownFolders,
          existing: state.projects,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        projects?: Project[];
        scan?: { scannedAt: string };
        stats?: { total: number; added: number; updated: number };
      };
      if (!data.ok || !data.projects) {
        return { ok: false, message: data.error ?? "Scan failed" };
      }
      dispatch({
        type: "SYNC_PROJECTS",
        payload: {
          projects: data.projects,
          scannedAt: data.scan?.scannedAt ?? new Date().toISOString(),
          count: data.stats?.total ?? data.projects.length,
        },
      });
      addActivity(
        `Disk scan: ${data.stats?.total ?? data.projects.length} projects (${data.stats?.added ?? 0} new)`,
        "project",
      );
      return {
        ok: true,
        message: `${data.stats?.total ?? data.projects.length} projects — ${data.stats?.added ?? 0} added, ${data.stats?.updated ?? 0} updated`,
      };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Scan failed" };
    }
  }, [state.settings.projectsRoots, state.settings.discoverUnknownFolders, state.projects, addActivity]);

  const createProject = useCallback(
    (input: { name: string; pitch: string; description: string; goals: string[]; platforms: string[] }) => {
      const project = attachConnections(createProjectShell({ ...input, bots: state.bots }));
      dispatch({ type: "ADD_PROJECT", payload: project });
      addActivity(`Created project: ${project.name}`, "project", project.id);
      return project;
    },
    [state.bots, addActivity],
  );

  useEffect(() => {
    if (!hydrated || !state.settings.autoDiscoverProjects) return;
    void syncProjectsFromDisk();
  }, [hydrated, state.settings.autoDiscoverProjects]); // eslint-disable-line react-hooks/exhaustive-deps

  const runQuickCommand = useCallback(
    (projectId: string, commandId: QuickCommandId) => {
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return { prompt: "", label: "" };
      const result = resolveQuickCommand(commandId, project, state);
      dispatch({
        type: "SET_WORKSPACE",
        payload: { activeRoute: result.routing, routeMode: "auto" as const },
      });
      addActivity(`${result.label} → ${project.name}`, "prompt", projectId);
      return { prompt: result.prompt, label: result.label };
    },
    [state, addActivity],
  );

  const value = useMemo<MissionControlContextValue>(
    () => ({
      state,
      updateSettings: (patch) => dispatch({ type: "UPDATE_SETTINGS", payload: patch }),
      updateProject: (project) => dispatch({ type: "UPDATE_PROJECT", payload: project }),
      updateTask: (task) => dispatch({ type: "UPDATE_TASK", payload: task }),
      addTask: (task) => dispatch({ type: "ADD_TASK", payload: task }),
      addPreset: (preset) => dispatch({ type: "ADD_PRESET", payload: preset }),
      addRoutingHistory: (entry) => dispatch({ type: "ADD_ROUTING_HISTORY", payload: entry }),
      addActivity,
      resetData: () => dispatch({ type: "RESET" }),
      getProject: (id) => state.projects.find((p) => p.id === id),
      getBot: (id) => state.bots.find((b) => b.id === id),
      activeProject,
      activeTask,
      switchProject,
      focusTask,
      setRoute,
      setRouteOverride,
      recomputeActiveRoute,
      promoteTaskInQueue,
      openWorkspace,
      closeWorkspace,
      minimizeWorkspace,
      restoreWorkspace,
      togglePinProject,
      setHandoffNote,
      setVoicePersisted,
      syncProjectsFromDisk,
      createProject,
      runQuickCommand,
    }),
    [
      state,
      addActivity,
      activeProject,
      activeTask,
      switchProject,
      focusTask,
      setRoute,
      setRouteOverride,
      recomputeActiveRoute,
      promoteTaskInQueue,
      openWorkspace,
      closeWorkspace,
      minimizeWorkspace,
      restoreWorkspace,
      togglePinProject,
      setHandoffNote,
      setVoicePersisted,
      syncProjectsFromDisk,
      createProject,
      runQuickCommand,
    ],
  );

  return <MissionControlContext.Provider value={value}>{children}</MissionControlContext.Provider>;
}

export function useMissionControl() {
  const ctx = useContext(MissionControlContext);
  if (!ctx) throw new Error("useMissionControl must be used within MissionControlProvider");
  return ctx;
}

/** Shorthand for workspace + active entities */
export function useWorkspace() {
  const { state, activeProject, activeTask, switchProject, focusTask, setRouteOverride, recomputeActiveRoute } =
    useMissionControl();
  return {
    workspace: state.workspace,
    activeProject,
    activeTask,
    activeRoute: state.workspace.activeRoute,
    routeMode: state.workspace.routeMode,
    switchProject,
    focusTask,
    setRouteOverride,
    recomputeActiveRoute,
  };
}
