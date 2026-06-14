import { cn } from "@/lib/utils";

export function ScoreRing({
  value,
  label,
  size = "md",
}: {
  value: number;
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? 88 : size === "md" ? 64 : 48;
  const stroke = size === "lg" ? 6 : 4;
  const r = (dim - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke="rgba(94,234,212,0.6)"
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-semibold text-zinc-200",
            size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm",
          )}
        >
          {value}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</span>
    </div>
  );
}
