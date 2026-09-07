import { cn } from "@/lib/utils";

export function StatPulse({
  count,
  label = "online",
  className,
}: {
  count: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-950",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-subtle" />
      {count} {label}
    </span>
  );
}
