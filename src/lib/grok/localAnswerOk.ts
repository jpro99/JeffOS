/**
 * Cursor is in charge: if the home model guesses, refuses Jeff OS, or
 * dumps thinking, do not keep that answer — escalate to paid Cursor.
 */

const REJECT =
  /\b(fictional|i cannot confirm|i don't know|i do not know|no (official|standard) definition|does not correspond|omnipotent|omniscient|god-like levels)\b/i;

export function localAnswerLooksUsable(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  if (t.length > 800) return false;
  if (/^thinking\.\.\./i.test(t)) return false;
  if (REJECT.test(t)) return false;
  return true;
}
