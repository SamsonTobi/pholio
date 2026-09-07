import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  width = 79,
  height = 26,
  priority = false,
}: {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/svgs/pholio_logo.svg"
      alt="pholio"
      width={width}
      height={height}
      priority={priority}
      className={cn("shrink-0", className)}
    />
  );
}

export function LogoMark({
  className,
  size = 24,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/svgs/pholio_mark.svg"
      alt="pholio"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0", className)}
    />
  );
}
