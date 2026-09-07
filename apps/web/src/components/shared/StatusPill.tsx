import * as React from "react";
import { cn } from "@/lib/utils";

export function StatusPill({
  status = "Shipped",
  className,
}: {
  status?: string;
  className?: string;
}) {
  const normalized = (status || "").toLowerCase();
  const isArchived = normalized === "archived";
  const isLive = normalized === "active" || normalized === "shipped";
  const label = isArchived ? "Archived" : isLive ? "Shipped" : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
        isArchived || !isLive
          ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          : "bg-green-100 text-green-700 dark:bg-green-950/80 dark:text-green-300",
        className
      )}
    >
      {label}
    </span>
  );
}
