import * as React from "react";
import { formatTimeAgo } from "@/lib/utils";

export function TimeAgo({
  date,
  prefix = "",
  className,
}: {
  date: string | Date | null | undefined;
  prefix?: string;
  className?: string;
}) {
  const formatted = formatTimeAgo(date);
  return (
    <span className={className}>
      {prefix ? `${prefix} ${formatted}` : formatted}
    </span>
  );
}
