import type { MicPermissionState } from "@/lib/types";

export interface RecognitionCallbacks {
  onStart?: () => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError: (message: string) => void;
}

export interface RecognitionStartOptions {
  /** Keep mic open until stop() — restarts after browser pauses */
  continuous?: boolean;
}

export interface SpeechRecognitionAdapter {
  readonly isSupported: boolean;
  requestPermission: () => Promise<MicPermissionState>;
  start: (callbacks: RecognitionCallbacks, options?: RecognitionStartOptions) => void;
  stop: () => void;
  abort: () => void;
}

type WebSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: { length: number; [index: number]: { isFinal: boolean; 0: { transcript: string } } };
  }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => WebSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => WebSpeechRecognition;
    webkitSpeechRecognition?: new () => WebSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function createSpeechRecognitionAdapter(): SpeechRecognitionAdapter {
  const Ctor = getSpeechRecognitionCtor();
  let recognition: WebSpeechRecognition | null = null;
  let sessionActive = false;
  let continuousMode = false;
  let callbacksRef: RecognitionCallbacks | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  const clearRestart = () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const endSession = () => {
    clearRestart();
    const cb = callbacksRef;
    callbacksRef = null;
    recognition = null;
    sessionActive = false;
    continuousMode = false;
    cb?.onEnd?.();
  };

  const bootRecognition = (isRestart: boolean) => {
    if (!Ctor || !sessionActive || !callbacksRef) return;

    recognition = new Ctor();
    recognition.continuous = continuousMode;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    if (!isRestart) {
      recognition.onstart = () => callbacksRef?.onStart?.();
    }

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const isFinal = event.results[event.results.length - 1]?.isFinal ?? false;
      callbacksRef?.onResult(transcript.trim(), isFinal);
    };

    recognition.onerror = (event) => {
      if (!sessionActive) return;
      if (continuousMode && (event.error === "no-speech" || event.error === "aborted")) {
        return;
      }
      const msg =
        event.error === "not-allowed"
          ? "Microphone permission denied."
          : event.error === "no-speech"
            ? "No speech detected. Try again."
            : `Speech error: ${event.error}`;
      sessionActive = false;
      clearRestart();
      callbacksRef?.onError(msg);
    };

    recognition.onend = () => {
      if (sessionActive && continuousMode) {
        clearRestart();
        restartTimer = setTimeout(() => bootRecognition(true), 120);
        return;
      }
      endSession();
    };

    try {
      recognition.start();
    } catch {
      if (continuousMode && sessionActive) {
        clearRestart();
        restartTimer = setTimeout(() => bootRecognition(true), 300);
      } else {
        sessionActive = false;
        callbacksRef?.onError("Could not start microphone. Try again.");
      }
    }
  };

  return {
    get isSupported() {
      return Ctor !== null;
    },

    async requestPermission(): Promise<MicPermissionState> {
      if (!Ctor) return "unsupported";
      if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return "granted";
      } catch {
        return "denied";
      }
    },

    start(callbacks, options) {
      if (!Ctor) {
        callbacks.onError("Speech recognition not supported in this browser.");
        return;
      }

      this.abort();
      sessionActive = true;
      continuousMode = options?.continuous ?? false;
      callbacksRef = callbacks;
      bootRecognition(false);
    },

    stop() {
      sessionActive = false;
      clearRestart();
      if (recognition) {
        recognition.stop();
      } else {
        endSession();
      }
    },

    abort() {
      sessionActive = false;
      clearRestart();
      recognition?.abort();
      recognition = null;
      callbacksRef = null;
    },
  };
}
