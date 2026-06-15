import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, glow, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-white/[0.06] bg-[#12141a]/80 p-5 backdrop-blur-sm transition",
        glow && "border-teal-500/20 shadow-[0_0_40px_-12px_rgba(45,212,191,0.25)]",
        onClick && "cursor-pointer hover:border-white/10 hover:bg-[#161922]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-sm font-semibold text-zinc-100", className)}>{children}</h3>;
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 text-sm text-zinc-500">{children}</div>;
}
