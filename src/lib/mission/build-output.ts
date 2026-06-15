/** True when pasted terminal output is a successful Next.js / npm build (not a failure). */
export function isSuccessfulBuildOutput(text: string): boolean {
  const t = text;
  if (/failed to compile/i.test(t)) return false;
  if (/error TS\d+/i.test(t)) return false;
  if (/Type error:/i.test(t)) return false;
  if (/Module not found/i.test(t)) return false;
  if (/Command finished with errors/i.test(t)) return false;
  if (/exit code [1-9]/i.test(t)) return false;

  const compiledOk = /✓ Compiled successfully/i.test(t) || /Compiled successfully in/i.test(t);
  const typesOk = /Finished TypeScript/i.test(t) || !/Running TypeScript/i.test(t);
  const pagesOk = /✓ Generating static pages/i.test(t) || /Generating static pages using/i.test(t);

  return compiledOk && typesOk && (pagesOk || /Route \(app\)/i.test(t));
}

/** Build succeeded but Turbopack/webpack emitted optional warnings (not errors). */
export function isBuildWarningsOnly(text: string): boolean {
  return isSuccessfulBuildOutput(text) && /encountered \d+ warnings?/i.test(text);
}
