import type { MicPermissionState } from "@/lib/types";

export interface RecognitionCallbacks {
  onStart?: () => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError: (message: string) => void;
}

export interface SpeechRecognitionAdapter {
  readonly isSupported: boolean;
  requestPermission: () => Promise<MicPermissionState>;
  start: (callbacks: RecognitionCallbacks) => void;
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

    start(callbacks) {
      if (!Ctor) {
        callbacks.onError("Speech recognition not supported in this browser.");
        return;
      }

      recognition = new Ctor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => callbacks.onStart?.();

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const isFinal = event.results[event.results.length - 1]?.isFinal ?? false;
        callbacks.onResult(transcript.trim(), isFinal);
      };

      recognition.onerror = (event) => {
        const msg =
          event.error === "not-allowed"
            ? "Microphone permission denied."
            : event.error === "no-speech"
              ? "No speech detected. Try again."
              : `Speech error: ${event.error}`;
        callbacks.onError(msg);
      };

      recognition.onend = () => callbacks.onEnd?.();

      try {
        recognition.start();
      } catch {
        callbacks.onError("Could not start microphone. Try again.");
      }
    },

    stop() {
      recognition?.stop();
    },

    abort() {
      recognition?.abort();
      recognition = null;
    },
  };
}
