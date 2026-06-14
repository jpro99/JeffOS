"use client";

import { useState } from "react";
import { copyToClipboard, cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

export function CopyButton({ text, label = "Copy", className, compact }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyToClipboard(text);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 font-medium text-zinc-300 transition hover:border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-200",
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        className,
      )}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
