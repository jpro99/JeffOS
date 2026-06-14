"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useMissionControl } from "@/lib/store/context";
import { createSpeechRecognitionAdapter } from "@/lib/voice/recognition";
import { parseVoiceCommand } from "@/lib/voice/parser";
import { executeVoiceCommand } from "@/lib/voice/executor";
import { speak, stopSpeaking } from "@/lib/voice/speech";
import type {
  MicPermissionState,
  VoiceCommandInterpretation,
  VoiceMode,
  VoiceUiPhase,
} from "@/lib/types";

interface VoiceContextValue {
  phase: VoiceUiPhase;
  isListening: boolean;
  isTranscribing: boolean;
  panelOpen: boolean;
  transcript: string;
  interpretation: VoiceCommandInterpretation | null;
  errorMessage: string | null;
  successMessage: string | null;
  micPermissionState: MicPermissionState;
  isSupported: boolean;
  voiceEnabled: boolean;
  voiceMode: VoiceMode;
  voiceResponseEnabled: boolean;
  lastVoiceCommand: VoiceCommandInterpretation | null;
  openPanel: () => void;
  closePanel: () => void;
  startListening: () => void;
  stopListening: () => void;
  cancel: () => void;
  retry: () => void;
  setTranscript: (text: string) => void;
  processTranscript: (text: string) => void;
  confirmCommand: () => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    state,
    switchProject,
    openWorkspace,
    setRoute,
    addActivity,
    setVoicePersisted,
  } = useMissionControl();

  const adapterRef = useRef(createSpeechRecognitionAdapter());
  const [phase, setPhase] = useState<VoiceUiPhase>("idle");
  const [panelOpen, setPanelOpen] = useState(false);
  const [transcript, setTranscriptState] = useState("");
  const [interpretation, setInterpretation] = useState<VoiceCommandInterpretation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [micPermissionState, setMicPermissionState] = useState<MicPermissionState>(
    state.workspace.voice.micPermissionState,
  );

  const voiceEnabled = state.settings.voiceEnabled;
  const voiceMode = state.settings.voiceMode;
  const voiceResponseEnabled = state.settings.voiceResponseEnabled;
  const lastVoiceCommand = state.workspace.voice.lastVoiceCommand;

  const isListening = phase === "listening";
  const isTranscribing = phase === "transcribing";

  useEffect(() => {
    if (adapterRef.current.isSupported && micPermissionState === "unknown") {
      void adapterRef.current.requestPermission().then((perm) => {
        setMicPermissionState(perm);
        setVoicePersisted({ micPermissionState: perm });
      });
    }
  }, [micPermissionState, setVoicePersisted]);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => {
    setPanelOpen(false);
    stopSpeaking();
  }, []);

  const runExecution = useCallback(
    (interp: VoiceCommandInterpretation) => {
      setPhase("processing");
      const result = executeVoiceCommand(interp, state);

      if (!result.success) {
        setPhase("error");
        setErrorMessage(result.message);
        speak(result.spokenResponse, voiceResponseEnabled);
        return;
      }

      if (result.projectId) {
        openWorkspace(result.projectId);
        switchProject(result.projectId);
      }
      if (result.routing) setRoute(result.routing, "auto");
      if (result.prompt) void navigator.clipboard.writeText(result.prompt);
      if (result.navigateTo) router.push(result.navigateTo);

      setVoicePersisted({ lastVoiceCommand: interp });
      addActivity(`Voice: ${interp.interpretedCommand}`, "routing", result.projectId);
      setSuccessMessage(result.message);
      setPhase("success");
      speak(result.spokenResponse, voiceResponseEnabled);
    },
    [
      state,
      openWorkspace,
      switchProject,
      setRoute,
      router,
      setVoicePersisted,
      addActivity,
      voiceResponseEnabled,
    ],
  );

  const processTranscript = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      setTranscriptState(trimmed);
      if (!trimmed) {
        setPhase("error");
        setErrorMessage("Empty transcript. Type or speak a command.");
        return;
      }

      setPhase("processing");
      setErrorMessage(null);
      setSuccessMessage(null);

      setTimeout(() => {
        const interp = parseVoiceCommand(trimmed, state, state.workspace.activeProjectId);
        setInterpretation(interp);
        setVoicePersisted({ lastVoiceCommand: interp });

        if (interp.requiresConfirmation) {
          setPhase("confirm");
        } else {
          runExecution(interp);
        }
      }, 350);
    },
    [state, setVoicePersisted, runExecution],
  );

  const startListening = useCallback(async () => {
    if (!voiceEnabled) return;
    setPanelOpen(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setInterpretation(null);

    if (!adapterRef.current.isSupported) {
      setPhase("error");
      setErrorMessage("Browser speech not supported. Use text command mode below.");
      setMicPermissionState("unsupported");
      setVoicePersisted({ micPermissionState: "unsupported" });
      return;
    }

    const perm = await adapterRef.current.requestPermission();
    setMicPermissionState(perm);
    setVoicePersisted({ micPermissionState: perm });

    if (perm === "denied") {
      setPhase("error");
      setErrorMessage("Microphone blocked. Allow mic in browser settings, then retry.");
      return;
    }

    setPhase("listening");
    setTranscriptState("");

    adapterRef.current.start({
      onStart: () => setPhase("listening"),
      onResult: (partial, isFinal) => {
        setTranscriptState(partial);
        if (!isFinal) setPhase("transcribing");
        if (isFinal && partial) {
          setPhase("transcribing");
          adapterRef.current.stop();
          processTranscript(partial);
        }
      },
      onError: (msg) => {
        setPhase("error");
        setErrorMessage(msg);
        if (msg.includes("denied")) {
          setMicPermissionState("denied");
          setVoicePersisted({ micPermissionState: "denied" });
        }
      },
      onEnd: () => {
        setPhase((p) => (p === "listening" ? "idle" : p));
      },
    });
  }, [voiceEnabled, processTranscript, setVoicePersisted]);

  const stopListening = useCallback(() => {
    adapterRef.current.stop();
    if (transcript.trim()) {
      processTranscript(transcript);
    } else {
      setPhase("idle");
    }
  }, [transcript, processTranscript]);

  const cancel = useCallback(() => {
    adapterRef.current.abort();
    stopSpeaking();
    setPhase("idle");
    setErrorMessage(null);
    setSuccessMessage(null);
    setInterpretation(null);
    setTranscriptState("");
  }, []);

  const retry = useCallback(() => {
    cancel();
    void startListening();
  }, [cancel, startListening]);

  const setTranscript = useCallback((text: string) => {
    setTranscriptState(text);
    setPhase(text ? "confirm" : "idle");
    setErrorMessage(null);
  }, []);

  const confirmCommand = useCallback(() => {
    const interp =
      interpretation ??
      parseVoiceCommand(transcript, state, state.workspace.activeProjectId);
    if (!interp.rawTranscript.trim()) {
      setPhase("error");
      setErrorMessage("Nothing to run. Speak or type a command.");
      return;
    }
    setInterpretation(interp);
    runExecution(interp);
  }, [interpretation, transcript, state, runExecution]);

  const value = useMemo<VoiceContextValue>(
    () => ({
      phase,
      isListening,
      isTranscribing,
      panelOpen,
      transcript,
      interpretation,
      errorMessage,
      successMessage,
      micPermissionState,
      isSupported: adapterRef.current.isSupported,
      voiceEnabled,
      voiceMode,
      voiceResponseEnabled,
      lastVoiceCommand,
      openPanel,
      closePanel,
      startListening,
      stopListening,
      cancel,
      retry,
      setTranscript,
      processTranscript,
      confirmCommand,
    }),
    [
      phase,
      isListening,
      isTranscribing,
      panelOpen,
      transcript,
      interpretation,
      errorMessage,
      successMessage,
      micPermissionState,
      voiceEnabled,
      voiceMode,
      voiceResponseEnabled,
      lastVoiceCommand,
      openPanel,
      closePanel,
      startListening,
      stopListening,
      cancel,
      retry,
      setTranscript,
      processTranscript,
      confirmCommand,
    ],
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice requires VoiceProvider");
  return ctx;
}
