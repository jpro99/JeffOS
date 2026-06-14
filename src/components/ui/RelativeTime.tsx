"use client";

import { useSyncExternalStore } from "react";
import { formatRelativeTime, formatStableDate, formatStableDateTime } from "@/lib/utils";

function subscribe(): () => void {
  return () => {};
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

interface RelativeTimeProps {
  iso: string;
  className?: string;
  /** Full date+time for settings-style rows */
  mode?: "relative" | "datetime";
}

/** SSR-safe relative time — stable on server, live after hydration. */
export function RelativeTime({ iso, className, mode = "relative" }: RelativeTimeProps) {
  const isClient = useIsClient();

  if (mode === "datetime") {
    return (
      <span className={className}>
        {isClient ? new Date(iso).toLocaleString("en-US") : formatStableDateTime(iso)}
      </span>
    );
  }

  return (
    <span className={className}>
      {isClient ? formatRelativeTime(iso) : formatStableDate(iso)}
    </span>
  );
}
