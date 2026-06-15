"use client";

import { useEffect, useState } from "react";

/** True after client mount — avoids SSR/client markup mismatches */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** localhost / 127.0.0.1 — false on server and first paint, then updates */
export function useIsLocalhost(): boolean {
  const [isLocal, setIsLocal] = useState(false);
  useEffect(() => {
    const h = window.location.hostname;
    setIsLocal(h === "localhost" || h === "127.0.0.1");
  }, []);
  return isLocal;
}
