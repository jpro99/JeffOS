/** Browser TTS — optional spoken confirmations */

export function speak(text: string, enabled: boolean): void {
  if (!enabled || typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.05;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
