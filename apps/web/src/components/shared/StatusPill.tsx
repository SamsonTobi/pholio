import * as React from "react";
import { cn } from "@/lib/utils";

export function StatusPill({
  status = "Shipped",
  className,
}: {
  status?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-950/80 dark:text-green-300",
        className
      )}
    >
      {status}
    </span>
  );
}
