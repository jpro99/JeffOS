import type { RepoProfile } from "@/lib/project-scan/repo-profile";

export type { RepoProfile };

export type InterfaceId = "cursor" | "claude-code" | "regular-claude" | "future-custom";

export type ModelClassId =
  | "cheap-fast"
  | "balanced"
  | "deep-reasoning"
  | "code-heavy"
  | "review-heavy"
  | "planning-heavy"
  | "long-context"
  | "autonomous-heavy";

export type BotTypeId =
  | "control-tower"
  | "project-god-bot"
  | "spec-bot"
  | "architect-bot"
  | "builder-bot"
  | "reviewer-bot"
  | "test-bot"
  | "debug-bot"
  | "refactor-bot"
  | "audit-bot"
  | "prompt-bot"
  | "integration-bot"
  | "data-model-bot"
  | "ux-bot"
  | "docs-bot"
  | "deployment-bot"
  | "cost-bot"
  | "security-risk-bot";

export type TaskStatus =
  | "planned"
  | "ready"
  | "running"
  | "blocked"
  | "review"
  | "done";

export type TaskTypeId =
  | "planning"
  | "architecture"
  | "feature"
  | "bugfix"
  | "refactor"
  | "test"
  | "review"
  | "deploy"
  | "docs"
  | "security"
  | "prompt"
  | "integration"
  | "ux"
  | "data-model"
  | "audit"
  | "cost-analysis"
  | "exploration";

export type ProjectStatus = "active" | "prototype" | "paused" | "idea" | "mature";

export type Priority = "P0" | "P1" | "P2" | "P3";

export type OptimizeFor = "speed" | "cost" | "quality" | "autonomy";

export type AutonomyLevel = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type CostSensitivity = "low" | "medium" | "high";
export type TaskSize = "tiny" | "small" | "medium" | "large" | "epic";

export interface InterfaceDefinition {
  id: InterfaceId;
  name: string;
  description: string;
  icon: string;
}

export interface ModelClassDefinition {
  id: ModelClassId;
  name: string;
  description: string;
  costTier: "low" | "mid" | "high";
}

export interface BotDefinition {
  id: string;
  type: BotTypeId;
  name: string;
  role: string;
  description: string;
  group: "control" | "project" | "worker";
  preferredInterface: InterfaceId;
  preferredModelClass: ModelClassId;
  promptPreview: string;
  projectIds: string[];
}

export type ReadinessLevel =
  | "idea"
  | "scaffolded"
  | "building"
  | "partially-working"
  | "usable"
  | "beta"
  | "production-ready"
  | "needs-repair";

export type QuickCommandId =
  | "continue-coding"
  | "fix-errors"
  | "next-step"
  | "god-mode"
  | "build-fast"
  | "review-security"
  | "audit-readiness"
  | "generate-prompt"
  | "route-task"
  | "what-to-do"
  | "ultimate-mode"
  | "continue-build"
  | "fix-next-issue"
  | "review-errors"
  | "strengthen-security"
  | "prepare-launch";

export type HealthStatus = "good" | "warn" | "bad";

export interface HealthScore {
  score: number;
  label: string;
  status: HealthStatus;
}

export interface ProjectError {
  id: string;
  title: string;
  likelyCause: string;
  severity: "low" | "medium" | "high" | "critical";
  fixRisk: "safe" | "medium" | "high";
  confidence: number;
  recommendedFix: string;
  aboutToDo: string;
  whyDoingIt: string;
  couldGoWrong: string;
  taskType: TaskTypeId;
  resolved?: boolean;
  /** From error-patterns.ts — toolchain vs code */
  fixType?: "toolchain" | "code" | "config" | "env";
  patternId?: string;
  suggestedCommands?: string[];
  doNotRewriteAppCode?: boolean;
}

export interface ErrorFixStep {
  id: string;
  sourceType: "error" | "blocker";
  sourceId: string;
  errorTitle: string;
  botType: BotTypeId;
  botId: string;
  botName: string;
  phase: "debug" | "fix" | "test" | "security";
  summary: string;
  detail: string;
  status: OrchestrationStepStatus;
  /** Jeff checked this — include in Cursor fix prompt */
  included: boolean;
}

export interface ErrorFixMission {
  id: string;
  status: "idle" | "planned" | "running" | "complete";
  startedAt?: string;
  completedAt?: string;
  steps: ErrorFixStep[];
  /** Last prompt built from selected steps */
  lastPrompt?: string;
  lastVerifiedAt?: string;
  lastVerifyPassed?: boolean;
  lastVerifySummary?: string;
}

export interface GapFixStep {
  id: string;
  gapId: string;
  gapTitle: string;
  gapCategory: string;
  botType: BotTypeId;
  botId: string;
  botName: string;
  phase: "plan" | "build" | "test";
  summary: string;
  detail: string;
  status: OrchestrationStepStatus;
  included: boolean;
}

export interface GapFixMission {
  id: string;
  status: "idle" | "planned" | "running" | "complete";
  startedAt?: string;
  completedAt?: string;
  steps: GapFixStep[];
  lastPrompt?: string;
}

export interface NextActionIntel {
  title: string;
  milestone: string;
  unresolvedIssue: string;
  recommendedPrompt: string;
  whyItMatters: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  priority: Priority;
  taskType: TaskTypeId;
  quickAction: QuickCommandId;
}

export interface GodModeIdea {
  id: string;
  question: string;
  insight: string;
  leverage: "high" | "medium" | "long-term";
}

export interface ProjectOps {
  plainSummary: string;
  readinessLevel: ReadinessLevel;
  buildPhase: string;
  percentComplete: number;
  readinessScore: number;
  demoReadyScore: number;
  productionReadyScore: number;
  working: string[];
  blocked: string[];
  whatsNext: string[];
  security: HealthScore;
  stability: HealthScore;
  quality: HealthScore;
  riskLevel: RiskLevel;
  technicalDebt: "low" | "medium" | "high";
  launchConfidence: number;
  missingPieces: string[];
  hardeningSteps: string[];
  blockers: string[];
  errors: ProjectError[];
  nextAction: NextActionIntel;
  godModeIdeas: GodModeIdea[];
  notes: string;
  errorFixMission?: ErrorFixMission;
  gapFixMission?: GapFixMission;
  /** Last Easy Mode command session — intent → bots → Cursor prompt */
  commandSession?: {
    id: string;
    intent: string;
    createdAt: string;
    lastPrompt: string;
    stepCount: number;
    featureCount: number;
    /** Stacked add-on intents from Builder Hub */
    addOns?: { intent: string; at: string }[];
    combinedIntent?: string;
  };
  /** Last honest verify snapshot from Rescan + verify build */
  liveVerify?: {
    at: string;
    buildPassed: boolean;
    canAdvance: boolean;
    summary: string;
  };
  /** Detected from disk scan — package manager, turbo, build command */
  repoProfile?: RepoProfile;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  type: string;
  stack: string[];
  status: ProjectStatus;
  priority: Priority;
  path?: string;
  github?: string;
  description: string;
  goals: string[];
  risks: string[];
  roadmap: string[];
  assignedGodBotId: string;
  workerBotIds: string[];
  preferredInterface: InterfaceId;
  preferredModelClass: ModelClassId;
  activeBotStrategy: string;
  /** Relative path under Jeff OS docs, e.g. projects/kepi-travel.md */
  godBotFile?: string;
  jeffMode: "caveman" | "normal";
  lastUpdated: string;
  ops: ProjectOps;
  /** How this project entered Jeff OS */
  discoverySource?: "catalog" | "scan" | "manual";
  /** Last disk scan found path */
  pathExists?: boolean;
  discoveredAt?: string;
  /** GitHub, Vercel, APIs, etc. */
  connections?: ProjectConnection[];
  /** Monthly spend estimate for this project */
  costProfile?: ProjectCostProfile;
  /** Scope, features, orchestration plan */
  orchestration?: ProjectOrchestration;
}

export type ConnectionKind =
  | "github"
  | "vercel"
  | "supabase"
  | "stripe"
  | "clerk"
  | "openai"
  | "gemini"
  | "anthropic"
  | "duffel"
  | "maptiler"
  | "upstash"
  | "resend"
  | "sentry"
  | "inngest"
  | "postgres"
  | "nas"
  | "local"
  | "other";

export interface ProjectConnection {
  id: string;
  kind: ConnectionKind;
  name: string;
  description?: string;
  url: string;
  dashboardUrl?: string;
  estimatedMonthlyUsd: number;
  /** manual = Jeff set it; estimated = catalog default; api = live pull later */
  billingSource: "manual" | "estimated" | "api";
  /** Jeff marks whether this service is actually hooked up */
  setupStatus?: IntegrationConnectionStatus;
}

export interface ProjectCostProfile {
  estimatedMonthlyUsd: number;
  lines: { connectionId: string; label: string; amountUsd: number }[];
  lastUpdated: string;
  notes?: string;
}

export type FeatureStatus =
  | "idea"
  | "not-built"
  | "planning"
  | "building"
  | "testing"
  | "security-review"
  | "done"
  | "blocked";

export type FeatureType = "core" | "nice-to-have" | "experimental";

export type FeatureSecurityStatus = "not-reviewed" | "reviewing" | "issues-found" | "ok";

export type OrchestrationStepStatus = "planned" | "building" | "done" | "skipped";

export type PlanningStatus = "draft" | "planning-approved" | "building" | "complete";

export type IntegrationConnectionStatus = "not-connected" | "needs-setup" | "connected";

export type CostPattern = "cheap" | "strong" | "mixed";

export interface ProjectScope {
  pitch: string;
  targetUsers: string;
  platforms: string[];
  techPreferences: string;
  constraints: {
    budget: string;
    timeline: string;
    complexity: RiskLevel;
  };
  updatedAt: string;
}

export interface FeatureBotStep {
  botType: BotTypeId;
  botId: string;
  phase: "spec" | "architect" | "build" | "test" | "security" | "docs" | "integration";
  status: OrchestrationStepStatus;
  interface: InterfaceId;
  modelClass: ModelClassId;
  summary: string;
}

export interface ProjectFeature {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  type: FeatureType;
  status: FeatureStatus;
  securityStatus: FeatureSecurityStatus;
  assignedSteps: FeatureBotStep[];
  createdAt: string;
  updatedAt: string;
}

export interface BrainstormCandidate {
  id: string;
  name: string;
  description: string;
  type: FeatureType;
  priority: Priority;
  rationale: string;
}

export interface OrchestrationBotAssignment {
  botType: BotTypeId;
  botId: string;
  role: string;
  featureIds: string[];
}

export interface OrchestrationPlan {
  id: string;
  approved: boolean;
  approvedAt?: string;
  costPattern: CostPattern;
  summary: string;
  buildOrder: string[];
  botAssignments: OrchestrationBotAssignment[];
  parallelGroups: string[][];
  modelNotes: string;
  generatedAt: string;
}

export interface IntegrationSuggestion {
  id: string;
  name: string;
  purpose: string;
  providers: {
    name: string;
    url: string;
    costRange: string;
    complexity: "low" | "medium" | "high";
  }[];
  recommendedProvider?: string;
  connectionStatus: IntegrationConnectionStatus;
  notes: string;
  authorizeUrl?: string;
  enables?: string;
}

export interface ProjectBotSuggestionSnapshot {
  buildMode: "god" | "standard" | "careful";
  generatedAt: string;
  recommendedGodBotId: string;
  recommendedWorkerBotIds: string[];
  strategyNote: string;
  headline: string;
  approach: string;
}

export interface ProjectOrchestration {
  scope: ProjectScope;
  features: ProjectFeature[];
  brainstormCandidates: BrainstormCandidate[];
  plan: OrchestrationPlan | null;
  integrationSuggestions: IntegrationSuggestion[];
  securityScore: number;
  planningStatus: PlanningStatus;
  /** Last suggested bot lineup from Settings or wizard */
  botSuggestion?: ProjectBotSuggestionSnapshot;
  /** Easy Mode learnings — what worked vs avoid repeating */
  retrospective?: {
    workingWell: string[];
    wouldNotRepeat: string[];
    updatedAt: string;
  };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  taskType: TaskTypeId;
  taskSize: TaskSize;
  status: TaskStatus;
  priority: Priority;
  selectedBotId: string;
  selectedInterface: InterfaceId;
  selectedModelClass: ModelClassId;
  recommendedRoute: RoutingDecision;
  routingMode: "auto" | "manual";
  generatedPrompt: string;
  resultNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoutingDecision {
  interface: InterfaceId;
  botType: BotTypeId;
  botId: string;
  modelClass: ModelClassId;
  confidence: number;
  reasons: string[];
  optimizeFor: OptimizeFor;
}

export interface RoutingPreset {
  id: string;
  name: string;
  taskType?: TaskTypeId;
  projectId?: string;
  interface: InterfaceId;
  botType: BotTypeId;
  modelClass: ModelClassId;
}

export interface RoutingHistoryEntry {
  id: string;
  projectId?: string;
  taskId?: string;
  decision: RoutingDecision;
  mode: "auto" | "manual";
  createdAt: string;
  label: string;
}

export interface ActivityEntry {
  id: string;
  type: "task" | "routing" | "prompt" | "project" | "bot";
  message: string;
  projectId?: string;
  createdAt: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  botType: BotTypeId;
  template: string;
}

export interface AppSettings {
  jeffMode: "caveman" | "normal";
  cavemanDefault: boolean;
  costSaveMode: boolean;
  defaultInterface: InterfaceId;
  autoRoute: boolean;
  preferredModelClass: ModelClassId;
  preferredBotSequence: BotTypeId[];
  compactMode: boolean;
  mobileMode: boolean;
  voiceEnabled: boolean;
  voiceMode: VoiceMode;
  voiceResponseEnabled: boolean;
  /** Auto-scan C:\\Projects on load */
  autoDiscoverProjects: boolean;
  /** Include unknown folders with package.json */
  discoverUnknownFolders: boolean;
  projectsRoots: string[];
  lastDiscoveryAt: string | null;
  lastDiscoveryCount: number;
  /** Alert when project monthly cost hits this (USD) */
  monthlyCostThresholdUsd: number;
  /** Yellow warning below threshold at this % (e.g. 80 = yellow at $80 if threshold $100) */
  costWarningPercent: number;
  /** New = minimal nav. Comfortable = hide route/compose. Expert = all. */
  experienceLevel: ExperienceLevel;
  /** classic = sidebar OS. easy = /easy guided flow (compare side by side). */
  uiMode: UiMode;
  /** Easy Mode walkthrough — step index into GUIDED_JOURNEY_STEPS */
  guidedJourneyStep: number;
  /** User finished mainstream walkthrough */
  guidedJourneyComplete: boolean;
  /** User hid walkthrough strip */
  guidedJourneyDismissed: boolean;
  /** ISO time of last Builder Hub "Build it" — unlocks Cursor step */
  guidedJourneyLastBuildAt: string | null;
  /** Saved Vercel / custom domain — open Jeff OS from phone */
  productionUrl: string | null;
}

export type VoiceMode = "push-to-talk" | "tap-to-talk";

/** How much UI complexity to show in Classic mode */
export type ExperienceLevel = "new" | "comfortable" | "expert";

/** Classic = full Jeff OS sidebar. Easy = guided mission UI at /easy */
export type UiMode = "classic" | "easy";

export type VoiceUiPhase =
  | "idle"
  | "listening"
  | "transcribing"
  | "processing"
  | "confirm"
  | "success"
  | "error";

export type MicPermissionState = "unknown" | "granted" | "denied" | "unsupported";

export interface VoiceCommandInterpretation {
  rawTranscript: string;
  interpretedCommand: string;
  quickCommandId?: QuickCommandId;
  targetProjectId?: string;
  targetBotId?: string;
  targetTaskId?: string;
  targetAction?: string;
  confidence: number;
  requiresConfirmation: boolean;
  navigateTo?: string;
  spokenResponse?: string;
  routingPreference?: "cheapest" | "strongest";
  statusLookup?: "readiness" | "blockers" | "errors";
}

export interface VoicePersistedState {
  lastVoiceCommand: VoiceCommandInterpretation | null;
  micPermissionState: MicPermissionState;
}

export interface PromptBuilderInput {
  projectId: string;
  taskType: TaskTypeId;
  goal: string;
  constraints: string;
  optimizeFor: OptimizeFor;
  autonomyLevel: AutonomyLevel;
  riskLevel: RiskLevel;
  costSensitivity: CostSensitivity;
  taskSize: TaskSize;
  requestedOutput: string;
}

export interface PromptBuilderOutput {
  controlTowerPacket: string;
  godBotPacket: string;
  workerPrompt: string;
  routing: RoutingDecision;
}

/** Active OS session — which project/task/route Jeff is in */
export interface WorkspaceState {
  activeProjectId: string | null;
  activeTaskId: string | null;
  recentProjectIds: string[];
  queueTaskIds: string[];
  activeRoute: RoutingDecision | null;
  routeMode: "auto" | "manual";
  pinnedProjectIds: string[];
  openWorkspaceIds: string[];
  minimizedProjectIds: string[];
  handoffNote: string;
  voice: VoicePersistedState;
}

export interface MissionControlState {
  projects: Project[];
  bots: BotDefinition[];
  tasks: Task[];
  routingPresets: RoutingPreset[];
  routingHistory: RoutingHistoryEntry[];
  activity: ActivityEntry[];
  settings: AppSettings;
  interfaces: InterfaceDefinition[];
  modelClasses: ModelClassDefinition[];
  workspace: WorkspaceState;
}
